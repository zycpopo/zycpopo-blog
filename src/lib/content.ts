import { getCollection, type CollectionEntry } from "astro:content";
import columns from "../data/columns.json";
import tags from "../data/tags.json";
import site from "../data/site.json";

export type BlogPost = CollectionEntry<"blog">;

export function postSlug(post: BlogPost) {
  return post.id.replace(/\\/g, "/").replace(/\/index$/, "");
}

export function withBase(path = "/") {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const result = `${base}${normalized}`.replace(/\/{2,}/g, "/");
  return result.endsWith("/") || /\.[a-z0-9]+$/i.test(result) ? result : `${result}/`;
}

export function absoluteUrl(path = "/") {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const basedPath = base && (normalized === base || normalized.startsWith(`${base}/`))
    ? normalized
    : withBase(normalized);
  return new URL(basedPath, site.url).toString();
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

export function getColumn(id: string) {
  return columns.find((column) => column.id === id);
}

export function getTag(id: string) {
  return tags.find((tag) => tag.id === id);
}

function validatePosts(posts: BlogPost[]) {
  const columnIds = new Set(columns.map((column) => column.id));
  const tagIds = new Set(tags.map((tag) => tag.id));
  const errors: string[] = [];

  for (const post of posts) {
    if (!columnIds.has(post.data.column)) {
      errors.push(`${post.id}: 未登记的专栏 “${post.data.column}”`);
    }
    for (const tag of post.data.tags) {
      if (!tagIds.has(tag)) errors.push(`${post.id}: 未登记的标签 “${tag}”`);
    }
  }

  if (errors.length) {
    throw new Error(`文章内容校验失败：\n${errors.join("\n")}`);
  }
}

export async function getAllPosts() {
  const posts = await getCollection("blog");
  validatePosts(posts);
  return posts.sort((a, b) => {
    const byDate = b.data.publishDate.valueOf() - a.data.publishDate.valueOf();
    return byDate || postSlug(a).localeCompare(postSlug(b));
  });
}

export async function getVisiblePosts() {
  const posts = await getAllPosts();
  return import.meta.env.DEV ? posts : posts.filter((post) => !post.data.draft);
}

export function countByColumn(posts: BlogPost[], columnId: string) {
  return posts.filter((post) => post.data.column === columnId && !post.data.draft).length;
}

export function countByTag(posts: BlogPost[], tagId: string) {
  return posts.filter((post) => post.data.tags.includes(tagId) && !post.data.draft).length;
}

export { columns, tags };
