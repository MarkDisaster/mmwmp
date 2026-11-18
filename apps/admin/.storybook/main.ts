import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/react-vite';

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
      name: '@storybook/react-vite',
      options: {},
   },
   staticDirs: ['../public'],
   typescript: {
      reactDocgen: 'react-docgen',
   },
   viteFinal: async (cfg) => {
      cfg.resolve = cfg.resolve ?? {};
      const aliasEntry = { find: '@', replacement: path.resolve(dirname, '../src') };
      if (Array.isArray(cfg.resolve.alias)) {
         cfg.resolve.alias = [...cfg.resolve.alias, aliasEntry];
      } else {
         cfg.resolve.alias = {
            ...(cfg.resolve.alias ?? {}),
            '@': path.resolve(dirname, '../src'),
         };
      }
      return cfg;
   },
};

export default config;
