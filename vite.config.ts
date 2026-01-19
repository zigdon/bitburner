/* eslint-env node */
import { defineConfig } from 'viteburner';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@/': resolve(__dirname, '/'),
      '/src/': resolve(__dirname, '/'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
  },
  viteburner: {
    watch: [{
      pattern: 'bitburner/2025/**/*.{js,ts,jsx,tsx}',
      transform: true,
      location: (file) => [{
        filename: file.replace(/^bitburner\/2025/, ''),
        server: "home"
      }]
    },{
      pattern: 'bitburner/2025/**/*.json',
      transform: false,
      location: (file) => [{
              filename: file.replace(/^bitburner\/2025/, ''),
              server: "home"
            }]
    }],
    sourcemap: 'inline',
  },
});
