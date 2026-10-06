# 个人技术博客

基于 Astro、TypeScript 和 Markdown 的静态个人技术博客，面向 GitHub Pages 项目站点部署。

项目目录：`zycpopo-blog`。

GitHub 仓库：`git@github.com:zycpopo/zycpopo-blog.git`。

正式博客地址：`https://zycpopo.github.io/zycpopo-blog/`（完成首次部署后可访问）。

## 开始使用

```bash
pnpm install
pnpm dev
```

正式构建：

```bash
pnpm build
```

新建文章：

```bash
pnpm new:post
```

## 首次配置

编辑 `src/data/site.json`，填写网站名称、作者、GitHub 用户名、仓库名、正式网址和 `base` 路径。

- `url`：`https://你的用户名.github.io`
- `base`：`/你的仓库名`

然后按需调整：

- `src/data/columns.json`：专栏
- `src/data/tags.json`：标签
- `src/data/projects.json`：项目
- `src/content/pages/about.md`：关于页面

## 文章维护

每篇文章放在独立文件夹中：

```text
src/content/blog/文章标识/
├── index.md
└── 可选的文章图片
```

新文章默认为草稿。将 `draft` 改为 `false` 后，文章才会出现在正式构建、专栏、标签、归档、RSS 和 Sitemap 中。

## 部署

推送到 `main` 分支后，`.github/workflows/deploy.yml` 会构建并部署 GitHub Pages。仓库设置中需要把 Pages 的 Source 设为 **GitHub Actions**。

每次构建会自动同步 GitHub 贡献热力图，6 小时内复用有效缓存。工作流每天执行一次；也可以运行 `pnpm fetch:contributions` 强制刷新。

有 `GITHUB_TOKEN` 时优先使用 GitHub API；没有令牌或 API 失败时，直接读取 GitHub 公开主页日历，不需要额外的后端。贡献数、日期和颜色等级均来自 GitHub 原始数据。同步失败时保留上次有效数据，不影响博客构建。令牌只在构建脚本中使用，不会写入网页。
