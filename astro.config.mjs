import { defineConfig } from 'astro/config';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'tearing-saga-series-publish';
const base = process.env.BASE_PATH ?? (process.env.GITHUB_ACTIONS === 'true' ? `/${repositoryName}` : '/');

export default defineConfig({
  output: 'static',
  publicDir: './public',
  site: process.env.SITE_URL ?? 'https://ss-park-0930.github.io',
  base,
  trailingSlash: 'always',
});
