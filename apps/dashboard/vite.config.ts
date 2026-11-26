import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const previewRoute = '/__movcues/sdk-theme-preview.min.js'
const previewBundle = path.resolve(import.meta.dirname, '../../../Loopz/dist/sdk-theme-preview.min.js')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'movcues-local-theme-preview',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== previewRoute || (request.method !== 'GET' && request.method !== 'HEAD')) return next()
        try {
          const bundle = await readFile(previewBundle)
          response.setHeader('Content-Type', 'text/javascript; charset=utf-8')
          response.end(request.method === 'HEAD' ? undefined : bundle)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return next(error)
          response.statusCode = 404
          response.end()
        }
      })
    },
  }],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
