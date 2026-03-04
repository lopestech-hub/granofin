import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/usuarios': 'http://localhost:3000',
      '/contas': 'http://localhost:3000',
      '/categorias': 'http://localhost:3000',
      '/lancamentos': 'http://localhost:3000',
      '/orcamentos': 'http://localhost:3000',
      '/relatorios': 'http://localhost:3000',
      '/assinaturas': 'http://localhost:3000',
      '/webhooks': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
})
