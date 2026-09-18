import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // bread/ is a separate project with its own node_modules and test run.
    exclude: [...configDefaults.exclude, 'bread/**'],
  },
})
