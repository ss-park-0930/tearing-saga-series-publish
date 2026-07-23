import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const trs1Chapters = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './content/trs1/guides/chapters',
  }),
  schema: z.object({
    id: z.string(),
    game: z.literal('trs1'),
    category: z.literal('chapters'),
    chapter: z.string(),
    route: z.string(),
    slug: z.string(),
    title: z.string(),
    titleJp: z.string(),
    status: z.enum(['outline', 'draft', 'review', 'published']),
    sourceIds: z.array(z.string()),
    relatedIds: z.array(z.string()),
    lastVerified: z.string().nullable(),
  }),
});

export const collections = { trs1Chapters };
