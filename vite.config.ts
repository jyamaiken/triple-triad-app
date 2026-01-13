import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Vercelデプロイ時はルート、ローカルやGitHub Pagesではサブパスを適用
  base: process.env.VERCEL ? '/' : '/triple-triad-app/',
  plugins: [react()],
  build: {
    outDir: 'dist',
  }
})
