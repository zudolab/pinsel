import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/notes' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = { notes };
