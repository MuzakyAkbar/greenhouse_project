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
      // 1. Proxy untuk Data (Port 80 standard)
      // Call ke /api-ob/... akan diteruskan ke http://202.59.169.85/openbravo/...
      '/plantara/api-ob': {
        target: 'https://mhnob.pirantisolusi.com',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api-ob/, '/openbravo'),
        configure: (proxy, options) => {
          proxy.on('error', (err) => console.error('❌ Proxy Data Error:', err.message));
        }
      },
      // 2. Proxy KHUSUS untuk Process (Port 8090)
      // Call ke /api-process/... akan diteruskan ke http://202.59.169.85:8090/api/...
      '/plantara/api-process': {
        target: 'https://mhnproc.pirantisolusi.com',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api-process/, '/api'),
        configure: (proxy, options) => {
          proxy.on('error', (err) => console.error('❌ Proxy Process Error:', err.message));
          proxy.on('proxyReq', (proxyReq, req) => {
             console.log('📤 Sending Process to 8090:', req.url);
          });
        }
      }
    }
  }
})