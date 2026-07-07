import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  integrations: [vue()],
  output: 'static',
  site: 'https://yun-ai-base.github.io',
  base: '/writers-gallery',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
});
