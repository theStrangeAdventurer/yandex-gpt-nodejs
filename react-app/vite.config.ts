import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'
// @ts-expect-error it's fine
import path from 'path'
import { config } from 'dotenv';

config({ path: '../.env' });

// https://vitejs.dev/config/
export default defineConfig({
  server: { https: true }, // Not needed for Vite 5+
  plugins: [
    mkcert({
      // @ts-expect-error it's fine
      keyFileName: path.join(process.cwd(), 'cert', 'localhost-key.pem'),
      // @ts-expect-error it's fine
      certFileName: path.join(process.cwd(), 'cert', 'localhost.pem'),
    }),
    react()
  ],
})
