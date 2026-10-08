import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Day 20｜dev 模式：把 /api/* 转到 CloudBase 网关，避免开发期跨域
// 生产构建不走这个：import.meta.env.PROD === true 时 src/lib/api.js 直接用绝对 URL
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
