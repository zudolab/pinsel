import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

export default defineConfig({
  site: 'https://pinsel-germany.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [react(), mdx(), sitemap()],
  markdown: {
    rehypePlugins: [rehypeSlug],
    remarkPlugins: [remarkGfm],
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: true,
    },
  },
});
