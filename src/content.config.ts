import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/index.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    column: z.string().min(1),
    tags: z.array(z.string()).default([]),
    draft: z.boolean()
  })
});

const pages = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1)
  })
});

export const collections = { blog, pages };
