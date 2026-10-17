import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * The public demo's build (docs/MATCH-PROTOTYPE.md, docs/DECISIONS.md release R4).
 *
 * A second build, run after the app's (`npm run build`), into the same dist:
 * the page at /demo/ and its scripts, styles and fonts under /demo-assets/.
 * It adds files and changes none — vite.config.ts is not touched, so the app's
 * HTML, sitemap, robots.txt, worker and version file are the app's alone
 * (tests/prototype/build.test.ts builds both and compares). It empties nothing
 * and copies none of public/, which the app's build has already done.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: false,
  build: {
    emptyOutDir: false,
    assetsDir: 'demo-assets',
    rollupOptions: { input: 'demo/index.html' },
  },
})
