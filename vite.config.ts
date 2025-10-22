import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // This proxies requests from the frontend to our Netlify function during development
      '/.netlify/functions': 'http://localhost:8888',
    },
  },
})
