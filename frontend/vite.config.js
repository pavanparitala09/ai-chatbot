import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/chat': 'http://localhost:8000',
      '/conversations': 'http://localhost:8000',
      '/messages': 'http://localhost:8000',
      '/new-chat': 'http://localhost:8000',
      '/usage': 'http://localhost:8000',
    },
  },
})
