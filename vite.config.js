import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Dev-only helper: POST a base64 data URL to /snap?name=foo and it lands in
 * _snaps/foo.jpg. Used to capture the WebGL canvas while developing; it is
 * never part of a production build.
 */
function snapshotEndpoint() {
  return {
    name: 'snapshot-endpoint',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/snap', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end('POST only')
        }
        const name = new URL(req.url, 'http://x').searchParams.get('name') || 'snap'
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', () => {
          try {
            const b64 = body.replace(/^data:image\/\w+;base64,/, '')
            const dir = path.resolve(server.config.root, '_snaps')
            fs.mkdirSync(dir, { recursive: true })
            const file = path.join(dir, `${name.replace(/[^\w-]/g, '')}.jpg`)
            fs.writeFileSync(file, Buffer.from(b64, 'base64'))
            res.end(file)
          } catch (err) {
            res.statusCode = 500
            res.end(String(err))
          }
        })
      })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), snapshotEndpoint()],
  server: { port: 8395, host: '127.0.0.1' },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          fx: ['postprocessing', '@react-three/postprocessing'],
        },
      },
    },
  },
})
