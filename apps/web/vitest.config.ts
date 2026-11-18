import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
   esbuild: { jsx: 'automatic' },
   resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
   },
   test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
      testTimeout: 60_000,
      env: {
         NEXT_PUBLIC_API_URL: 'http://localhost:3247',
         NEXT_PUBLIC_SITE_URL: 'http://localhost:3047',
      },
   },
});
