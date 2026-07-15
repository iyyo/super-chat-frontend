import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3344',
        changeOrigin: true,
        // 勿开 ws:true — RTASR 录音 WS 直连 3344（见 buildRtAsrWsUrl），代理会导致 ECONNRESET
      },
    },
  },
})
