import { defineConfig } from 'astro/config';

// GitHub Pages project site: https://<user>.github.io/zelmedservice/
const site = process.env.SITE_URL || 'https://zelmedservice.ru';
const base = process.env.BASE_PATH || '/zelmedservice';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
