import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    outDir: resolve(__dirname, '../../koreanNoteV2'),
    emptyOutDir: true,
    sourcemap: false,
  },
})
