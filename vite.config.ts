import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Проксируем все запросы к API
      '/api': {
        target: 'http://localhost:5442',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''), // убираем /api
      },
      '/auth': {
        target: 'http://localhost:5442',
        changeOrigin: true,
        secure: false,
      },
      '/users': {
        target: 'http://localhost:5442',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
