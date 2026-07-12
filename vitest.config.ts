import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import autoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    // Réplique les auto-imports de Vue fournis par Nuxt (ref, computed…) pour
    // que les composants testés ici n'aient pas besoin d'imports explicites.
    autoImport({ imports: ['vue'], dts: false }),
    vue(),
  ],
  resolve: {
    alias: {
      '~~': fileURLToPath(new URL('.', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
})
