// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Production domain is still assumption A7 in docs/PRD.md; confirm before launch.
  site: 'https://bodygalleryaesthetics.com',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
