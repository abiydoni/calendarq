import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import fs from 'fs';

const packageJson = JSON.parse(fs.readFileSync('./package.json'));

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/dist-electron/**', '**/dist/**']
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  }
})
