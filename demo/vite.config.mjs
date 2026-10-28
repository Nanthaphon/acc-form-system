// `npm run dev:demo` — the real app, with Supabase swapped for an in-memory
// fake holding made-up data (demo/fakeSupabase.ts). Nothing it does reaches the
// real database; a reload starts the data over. See docs/environments.md.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const real = path.normalize(path.join(root, 'src', 'lib', 'supabase.ts'))
const fake = path.join(here, 'fakeSupabase.ts')

export default defineConfig({
  root,
  // its own dependency cache: sharing node_modules/.vite with a running dev
  // server rewrites that server's optimized deps and blanks its pages (504)
  cacheDir: path.join(root, 'node_modules', '.vite-demo'),
  // the banner across the top says this is not the real system
  define: { 'import.meta.env.VITE_APP_ENV': JSON.stringify('demo') },
  plugins: [react(), {
    name: 'demo-supabase',
    enforce: 'pre',
    async resolveId(source, importer, opts) {
      if (!/lib\/supabase$/.test(source)) return null
      const r = await this.resolve(source, importer, { ...opts, skipSelf: true })
      return r && path.normalize(r.id) === real ? fake : null
    },
  }],
  server: { port: 5198, strictPort: true },
})
