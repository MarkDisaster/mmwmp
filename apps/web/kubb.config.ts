import { defineConfig } from '@kubb/core';
import { pluginClient } from '@kubb/plugin-client';
import { pluginOas } from '@kubb/plugin-oas';
import { pluginTs } from '@kubb/plugin-ts';

export default defineConfig({
   root: '.',
   input: {
      path: './src/api/schema.json',
   },
   output: {
      path: './src/api/generated',
      clean: true,
      extension: { '.ts': '' },
   },
   plugins: [
      pluginOas({ validate: false }),
      pluginTs({
         output: {
            path: './models',
            banner: '/* eslint-disable */',
            barrelType: false,
         },
      }),
      pluginClient({
         output: {
            path: './clients',
            banner: '/* eslint-disable */',
         },
         importPath: './../../axiosClient',
         dataReturnType: 'full',
      }),
   ],
});
