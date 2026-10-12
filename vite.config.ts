import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // «@/api/client» -> src/api/client; те же пути заданы в tsconfig.app.json (paths)
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
