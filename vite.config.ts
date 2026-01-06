// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // リポジトリ名が 'triple-triad-app' の場合。末尾のスラッシュを忘れないでください
  base: '/triple-triad-app/', 
  plugins: [react()],
})