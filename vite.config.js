import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite 配置：React 插件 + Tailwind v4 插件
// 为什么手写而不用脚手架生成：Project1 里已有文档文件，脚手架要求空目录；
// 且手写的每一行都能讲清楚来龙去脉（AGENTS.md 四.2）
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
})
