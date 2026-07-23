import { defineConfig } from 'astro/config';

const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  output: 'static',
  publicDir: './public',
  site: process.env.SITE_URL ?? 'https://ts.soaptree.dev',
  base,
  trailingSlash: 'always',
});
