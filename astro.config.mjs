import { readFileSync } from "node:fs";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const siteConfig = JSON.parse(readFileSync(new URL("./src/data/site.json", import.meta.url), "utf8"));

export default defineConfig({
  site: siteConfig.url,
  base: siteConfig.base,
  trailingSlash: "always",
  integrations: [sitemap({ filter: (page) => !page.endsWith("/404/") })],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex]
    }),
    shikiConfig: {
      theme: "github-dark-default",
      wrap: true
    }
  }
});
