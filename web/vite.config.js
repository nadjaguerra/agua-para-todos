import { defineConfig } from 'vite';
export default defineConfig({
  base:'./',
  esbuild:{jsxFactory:'h',jsxFragment:'Fragment'},
  build:{chunkSizeWarningLimit:5000,rollupOptions:{output:{manualChunks:{charts:['plotly.js-dist-min'],map:['leaflet']}}}}
});
