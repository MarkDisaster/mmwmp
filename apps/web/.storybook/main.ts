import type { StorybookConfig } from '@storybook/nextjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
   stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
   addons: [
      '@storybook/addon-docs',
      '@storybook/addon-a11y',
      '@storybook/addon-themes',
      '@chromatic-com/storybook',
   ],
   framework: {
      name: '@storybook/nextjs',
      options: {
         nextConfigPath: path.resolve(dirname, '../next.config.ts'),
      },
   },
   staticDirs: ['../public', { from: '../src/app/fonts', to: 'src/app/fonts' }],
   env: (config) => ({
      ...config,
      NEXT_PUBLIC_API_URL: config.NEXT_PUBLIC_API_URL ?? 'http://localhost:3247',
      NEXT_PUBLIC_SITE_URL: config.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:6047',
   }),
   typescript: {
      reactDocgen: 'react-docgen',
   },
   webpackFinal: async (cfg) => {
      const fileLoaderRule = cfg.module?.rules?.find(
         (rule): rule is { test?: { test: (s: string) => boolean }; exclude?: RegExp } =>
            !!rule &&
            typeof rule === 'object' &&
            'test' in rule &&
            rule.test instanceof RegExp &&
            rule.test.test('.svg'),
      );
      if (fileLoaderRule && typeof fileLoaderRule === 'object') {
         (fileLoaderRule as { exclude?: RegExp }).exclude = /\.svg$/;
      }
      cfg.module?.rules?.push({
         test: /\.svg$/,
         use: ['@svgr/webpack'],
      });

      if (cfg.resolve) {
         cfg.resolve.alias = {
            ...(cfg.resolve.alias ?? {}),
            '@': path.resolve(dirname, '../src'),
         };
      }
      return cfg;
   },
};

export default config;
