import { defineConfig } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig({
  ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  overrides: [...nextVitals, ...nextTs],
})