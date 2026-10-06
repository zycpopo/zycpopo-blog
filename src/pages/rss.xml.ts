import rss from "@astrojs/rss";
import { marked } from "marked";
import { getAllPosts, absoluteUrl, getColumn, getTag, postSlug } from "../lib/content";
import site from "../data/site.json";

export async function GET() {
  const posts = (await getAllPosts()).filter((post) => !post.data.draft).slice(0, 20);
  return rss({
    title: site.name,
    description: site.description,
    site: absoluteUrl("/"),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishDate,
      link: absoluteUrl(`/posts/${postSlug(post)}/`),
      categories: [
        getColumn(post.data.column)?.name ?? post.data.column,
        ...post.data.tags.map((tag) => getTag(tag)?.name ?? tag)
      ],
      content: marked.parse(post.body ?? "") as string,
      customData: post.data.updatedDate
        ? `<lastBuildDate>${post.data.updatedDate.toUTCString()}</lastBuildDate>`
        : undefined
    }))
  });
}
