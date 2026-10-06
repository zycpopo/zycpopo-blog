import { readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchCalendar, normalizeCalendar } from "./lib/contributions.mjs";

const root = resolve(import.meta.dirname, "..");
const site = JSON.parse(await readFile(resolve(root, "src/data/site.json"), "utf8"));
const username = site.github.username;
const cachePath = resolve(root, "public/data/contributions.json");
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
let cached = null;
try {
  const candidate = JSON.parse(await readFile(cachePath, "utf8"));
  if (candidate.username === username) {
    normalizeCalendar(candidate.weeks.flatMap((week) => week.contributionDays), candidate.totalContributions);
    cached = candidate;
  }
} catch {
  // An empty or incompatible cache should trigger a real refresh.
}

if (!username || username === "your-github-username") {
  console.log("尚未配置 GitHub 用户名，跳过贡献数据同步。");
} else {
  const age = Date.now() - Date.parse(cached?.updatedAt ?? "");
  const fresh = cached && age >= 0 && age < 6 * 60 * 60 * 1000;
  if (fresh && !process.argv.includes("--force")) {
    console.log(`使用 ${username} 最近同步的贡献数据（${cached.totalContributions} 次贡献）。`);
  } else {
    try {
      const calendar = await fetchCalendar(username, { token });
      const data = { username, ...calendar, updatedAt: new Date().toISOString() };
      await writeFile(`${cachePath}.tmp`, `${JSON.stringify(data, null, 2)}\n`, "utf8");
      await rename(`${cachePath}.tmp`, cachePath);
      console.log(`已从 ${calendar.source === "github-profile" ? "GitHub 公开主页" : "GitHub API"} 同步 ${username} 的 ${calendar.totalContributions} 次贡献。`);
    } catch (error) {
      console.warn(`贡献数据同步失败：${error.message}`);
      console.warn(cached ? `保留上次有效数据（${cached.updatedAt}），继续构建。` : "没有可用的贡献缓存，页面将显示未同步状态。博客仍可构建。");
    }
  }
}
