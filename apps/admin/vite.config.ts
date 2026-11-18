import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig({
   plugins: [
      tanstackRouter({
         target: 'react',
         routesDirectory: './src/routes',
         generatedRouteTree: './src/routes/routeTree.gen.ts',
         autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
      svgr(),
      sentryVitePlugin({
         disable: !uploadSourceMaps,
         org: 'marekmedia',
         project: 'mm-admin',
         url: 'https://de.sentry.io',
         authToken: process.env.SENTRY_AUTH_TOKEN,
         release: { name: process.env.VITE_SENTRY_RELEASE },
         sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
         telemetry: false,
      }),
   ],
   build: {
      sourcemap: uploadSourceMaps ? 'hidden' : false,
   },
   resolve: {
      alias: {
         '@': path.resolve(__dirname, './src'),
      },
   },
   server: {
      port: 3147,
   },
});
