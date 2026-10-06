import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const root = resolve(import.meta.dirname, "..");
const columns = JSON.parse(await readFile(resolve(root, "src/data/columns.json"), "utf8"));
const rl = createInterface({ input, output });

const title = (await rl.question("文章标题：")).trim();
if (!title) {
  rl.close();
  throw new Error("文章标题不能为空。");
}

const generatedSlug = `post-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12)}`;
const slugInput = (await rl.question(`英文地址标识（直接回车使用 ${generatedSlug}）：`)).trim();
const slug = (slugInput || generatedSlug)
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/^-+|-+$/g, "");

output.write("\n请选择所属专栏：\n");
columns.forEach((column, index) => output.write(`  ${index + 1}. ${column.name}\n`));
const selected = Number.parseInt(await rl.question("输入序号："), 10) - 1;
const column = columns[selected];
if (!column) {
  rl.close();
  throw new Error("专栏序号无效。");
}

const description = (await rl.question("文章摘要（可以稍后修改）：")).trim() || "请补充文章摘要。";
rl.close();

const directory = resolve(root, "src/content/blog", slug);
const target = resolve(directory, "index.md");
if (existsSync(target)) throw new Error(`文章已存在：${slug}`);

const today = new Date().toISOString().slice(0, 10);
const safeTitle = title.replaceAll('"', '\\"');
const safeDescription = description.replaceAll('"', '\\"');
const content = `---
title: "${safeTitle}"
description: "${safeDescription}"
publishDate: ${today}
column: ${column.id}
tags: []
draft: true
---

在这里开始写正文。
`;

await mkdir(directory, { recursive: true });
await writeFile(target, content, "utf8");
output.write(`\n已创建草稿：src/content/blog/${slug}/index.md\n`);
