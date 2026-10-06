import assert from "node:assert/strict";
import test from "node:test";
import { fetchCalendar, normalizeCalendar, parsePublicCalendar } from "./lib/contributions.mjs";

const days = Array.from({ length: 366 }, (_, index) => ({
  date: new Date(Date.UTC(2025, 9, 8) + index * 86_400_000).toISOString().slice(0, 10),
  contributionCount: index === 0 ? 1001 : index === 365 ? 1 : 0,
  level: index === 0 ? 4 : index === 365 ? 1 : 0
}));
const html = `<h2>1,002\n contributions\n in the last year</h2>` + [...days].reverse().map((day, index) =>
  `<td data-level='${day.level}' id='day-${index}' data-date='${day.date}'></td>` +
  `<tool-tip for='day-${index}'>${day.contributionCount ? day.contributionCount.toLocaleString("en-US") : "No"} ${day.contributionCount === 1 ? "contribution" : "contributions"} on October 8th.</tool-tip>`
).join("");

test("public calendar preserves dates, exact counts and GitHub levels, including partial weeks", () => {
  const calendar = parsePublicCalendar(html);
  assert.equal(calendar.totalContributions, 1002);
  assert.deepEqual(calendar.weeks[0].contributionDays[0], days[0]);
  assert.deepEqual(calendar.weeks.at(-1).contributionDays.at(-1), days.at(-1));
  assert.equal(calendar.weeks.flatMap((week) => week.contributionDays).length, 366);
});

test("missing tooltip cannot silently turn a contribution into zero", () => {
  assert.throws(() => parsePublicCalendar(html.replace(/<tool-tip[^>]*>[\s\S]*?<\/tool-tip>/, "")), /缺少每日贡献数量/);
});

test("inconsistent total cannot overwrite valid cached data", () => {
  assert.throws(() => parsePublicCalendar(html.replace("1,002", "1,003")), /总数与每日数据不一致/);
});

test("duplicate or missing days are rejected", () => {
  assert.throws(() => normalizeCalendar([days[0], ...days.slice(0, -1)], 2002), /重复或缺失/);
});

test("no token still fetches the public GitHub calendar", async () => {
  const calls = [];
  const calendar = await fetchCalendar("zycpopo", { fetcher: async (url, options) => {
    calls.push({ url, options });
    return new Response(html);
  } });
  assert.equal(calendar.totalContributions, 1002);
  assert.equal(calendar.source, "github-profile");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://github.com/users/zycpopo/contributions");
  assert.equal(calls[0].options.headers.Authorization, undefined);
});

test("invalid API token falls back to public data without sending the token to github.com", async () => {
  const calls = [];
  const calendar = await fetchCalendar("zycpopo", { token: "test-only-token", warn: () => {}, fetcher: async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? new Response("Unauthorized", { status: 401 }) : new Response(html);
  } });
  assert.equal(calendar.source, "github-profile");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.headers.Authorization, undefined);
});

test("GraphQL uses authoritative quartile levels rather than fixed contribution thresholds", async () => {
  const levels = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];
  const apiDays = days.map((day) => ({ ...day, contributionLevel: levels[day.level] }));
  const response = { data: { user: { contributionsCollection: { contributionCalendar: { totalContributions: 1002, weeks: [{ contributionDays: apiDays }] } } } } };
  const calendar = await fetchCalendar("zycpopo", { token: "test-only-token", fetcher: async () => Response.json(response) });
  assert.equal(calendar.source, "github-graphql");
  assert.deepEqual(calendar.weeks[0].contributionDays[0], days[0]);
});
