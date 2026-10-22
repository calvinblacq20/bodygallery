// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Production domain is still assumption A7 in docs/PRD.md; confirm before launch.
  site: 'https://bodygalleryaesthetics.com',
  trailingSlash: 'never',
  build: {
    // services/index.html rather than services.html: /services and the /services/<slug>
    // pages can then live side by side on any static host (Vercel, Cloudflare, Netlify).
    format: 'directory',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
