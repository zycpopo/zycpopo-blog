import type { APIRoute } from "astro";
import { absoluteUrl } from "../lib/content";

export const GET: APIRoute = () => new Response(
  `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl("/sitemap-index.xml")}\n`,
  { headers: { "Content-Type": "text/plain; charset=utf-8" } }
);
