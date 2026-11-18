import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
   resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
   },
   test: {
      projects: [
         {
            extends: true,
            test: {
               name: 'unit',
               environment: 'node',
               include: ['src/**/*.test.ts'],
            },
         },
         {
            extends: true,
            test: {
               name: 'dom',
               environment: 'jsdom',
               include: ['src/**/*.test.tsx'],
               setupFiles: ['./src/test/setup.ts'],
               testTimeout: 15_000,
               retry: process.env.CI ? 2 : 0,
            },
         },
      ],
   },
});
