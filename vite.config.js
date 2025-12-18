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
      // Proxy untuk Data dengan base path
      '/plantara/api-ob': {
        target: 'https://api1.pirantisolusi.com/obmhn/v1',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/plantara\/api-ob/, '/openbravo'),
        configure: (proxy, options) => {
          proxy.on('error', (err) => console.error('❌ Proxy Data Error:', err.message));
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('📤 Proxying to Openbravo:', req.url);
          });
        }
      },
      // Proxy untuk Process dengan base path
      '/plantara/api-process': {
        target: 'https://mhnproc.pirantisolusi.com/api/process',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/plantara\/api-process/, '/api'),
        configure: (proxy, options) => {
          proxy.on('error', (err) => console.error('❌ Proxy Process Error:', err.message));
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('📤 Sending Process to:', req.url);
          });
        }
      }
    }
  }
})