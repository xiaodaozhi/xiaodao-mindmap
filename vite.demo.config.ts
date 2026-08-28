import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Demo build: bundles the demo page (index.html -> src/main.ts -> src/App.vue)
// as a standard application (NOT a library) into the dist-demo/ directory.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
  },
})
