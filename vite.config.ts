import { defineConfig } from 'vite';

export default defineConfig({
  root: 'www',
  server: {
    fs: {
      allow: ['..']
    }
  },
});
