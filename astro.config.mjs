import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  integrations: [vue()],
  output: 'static',
  site: 'https://mylord.github.io',
  // base: '/writers-gallery', // 仅当部署到 GitHub Pages 子目录时启用
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
});
