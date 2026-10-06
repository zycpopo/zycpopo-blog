const DAY_MS = 86_400_000;
const LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];

function attributes(markup) {
  return Object.fromEntries([...markup.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map((match) => [match[1], match[3]]));
}

export function normalizeCalendar(days, totalContributions) {
  if (!Array.isArray(days) || days.length < 365 || days.length > 367) throw new Error("GitHub 没有返回完整的年度贡献日历。");
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let previous = null;
  for (const day of sorted) {
    const timestamp = Date.parse(`${day.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== day.date) throw new Error("GitHub 贡献日历包含无效日期。");
    if (!Number.isSafeInteger(day.contributionCount) || day.contributionCount < 0 || !Number.isInteger(day.level) || day.level < 0 || day.level > 4) throw new Error(`GitHub 贡献日历包含无效数据：${day.date}`);
    if ((day.contributionCount === 0) !== (day.level === 0)) throw new Error(`GitHub 贡献数量和颜色等级不匹配：${day.date}`);
    if (previous !== null && timestamp - previous !== DAY_MS) throw new Error("GitHub 贡献日历存在重复或缺失的日期。");
    previous = timestamp;
  }
  const total = sorted.reduce((sum, day) => sum + day.contributionCount, 0);
  if (!Number.isSafeInteger(totalContributions) || totalContributions < 0 || total !== totalContributions) throw new Error("GitHub 贡献总数与每日数据不一致。");
  const firstDate = new Date(`${sorted[0].date}T00:00:00Z`);
  const firstSunday = firstDate.valueOf() - firstDate.getUTCDay() * DAY_MS;
  const weeks = [];
  for (const day of sorted) {
    const index = Math.floor((Date.parse(`${day.date}T00:00:00Z`) - firstSunday) / (7 * DAY_MS));
    weeks[index] ??= { contributionDays: [] };
    weeks[index].contributionDays.push({ date: day.date, contributionCount: day.contributionCount, level: day.level });
  }
  return { totalContributions, weeks };
}

export function parsePublicCalendar(html) {
  const totalMatch = html.match(/([\d,]+)\s+contributions?\s+in the last year/i);
  if (!totalMatch) throw new Error("GitHub 页面缺少年度贡献总数。");
  const counts = new Map();
  for (const match of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/gi)) {
    const target = attributes(match[1]).for;
    const label = match[2].replace(/<[^>]*>/g, "").trim();
    const countMatch = label.match(/^(No|[\d,]+) contributions? on\b/i);
    if (target && countMatch) counts.set(target, countMatch[1].toLowerCase() === "no" ? 0 : Number(countMatch[1].replaceAll(",", "")));
  }
  const days = [];
  for (const match of html.matchAll(/<td\b([^>]*\bdata-date\s*=[^>]*)>/gi)) {
    const cell = attributes(match[1]);
    if (!counts.has(cell.id)) throw new Error(`GitHub 页面缺少每日贡献数量：${cell["data-date"]}`);
    if (!/^[0-4]$/.test(cell["data-level"] ?? "")) throw new Error("GitHub 页面缺少颜色等级。");
    days.push({ date: cell["data-date"], contributionCount: counts.get(cell.id), level: Number(cell["data-level"]) });
  }
  return normalizeCalendar(days, Number(totalMatch[1].replaceAll(",", "")));
}

export async function fetchCalendar(username, { token, fetcher = fetch, warn = console.warn } = {}) {
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) throw new Error("GitHub 用户名无效。");
  if (token) {
    try {
      const query = `query($username: String!) {
        user(login: $username) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks { contributionDays { date contributionCount contributionLevel } }
            }
          }
        }
      }`;
      const response = await fetcher("https://api.github.com/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "zycpopo-blog-build" },
        body: JSON.stringify({ query, variables: { username } }), signal: AbortSignal.timeout(20_000)
      });
      if (!response.ok) throw new Error(`GitHub API 返回 ${response.status}`);
      const result = await response.json();
      if (result.errors?.length) throw new Error(result.errors.map((item) => item.message).join("; "));
      const calendar = result.data?.user?.contributionsCollection?.contributionCalendar;
      if (!calendar) throw new Error("GitHub API 没有返回贡献日历。");
      const days = calendar.weeks.flatMap((week) => week.contributionDays.map((day) => ({ ...day, level: LEVELS.indexOf(day.contributionLevel) })));
      return { ...normalizeCalendar(days, calendar.totalContributions), source: "github-graphql" };
    } catch (error) {
      warn(`GitHub API 同步失败，改为读取公开主页：${error.message}`);
    }
  }
  const response = await fetcher(`https://github.com/users/${encodeURIComponent(username)}/contributions`, {
    headers: { Accept: "text/html", "User-Agent": "zycpopo-blog-build" }, signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`GitHub 公开日历返回 ${response.status}`);
  return { ...parsePublicCalendar(await response.text()), source: "github-profile" };
}
