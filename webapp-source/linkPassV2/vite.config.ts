import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'node:path'

export default defineConfig({
  base: './',
  plugins: [preact()],
  build: {
    outDir: resolve(__dirname, '../../linkPassV2'),
    emptyOutDir: true,
    sourcemap: false,
  },
})
