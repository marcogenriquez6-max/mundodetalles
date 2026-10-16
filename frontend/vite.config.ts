import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      // Canal en tiempo real (autorización de descuentos por WebSocket)
      '/socket.io': {
        target: 'http://localhost:3002',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
