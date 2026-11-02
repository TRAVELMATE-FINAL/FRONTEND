import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'oxc',
    // Transpile down for older mobile browsers / WebViews. es2020 left modern
    // syntax (optional chaining ?., nullish ??, async/await) un-lowered, which
    // crashed older Android Chrome/WebView and older Safari. es2015 + explicit
    // older Safari/Chrome/Firefox targets lower all of it to widely-supported
    // syntax. (No runtime polyfills are needed — the code uses none of the
    // newer built-in methods like replaceAll / allSettled / IntersectionObserver.)
    target: ['es2015', 'safari11', 'chrome64', 'firefox62', 'edge79'],
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
  },
});
