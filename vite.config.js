import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  base: '/plantara/',
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api-ob': {
        target: 'http://202.59.169.85',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api-ob/, '/openbravo'),
      },
    },
  },
})