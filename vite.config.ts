import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Must match DEFAULT_SITE_HOST in src/lib/site.ts. */
const DEFAULT_SITE_HOST = 'joinniyyah.com'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The social-card tags need an absolute URL, which means the host has to be
  // known at build time. Reading it here keeps index.html free of a hostname
  // we do not own — see the note in src/lib/site.ts.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const host = env.VITE_SITE_HOST || DEFAULT_SITE_HOST

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'niyyah-site-host',
        transformIndexHtml: (html: string) => html.replaceAll('%SITE_HOST%', host),
      },
    ],
  }
})
