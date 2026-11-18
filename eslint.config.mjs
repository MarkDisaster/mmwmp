import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
   {
      ignores: [
         '**/dist/**',
         '**/node_modules/**',
         '**/.turbo/**',
         '**/coverage/**',
         '**/generated/**',
      ],
   },

   {
      files: ['**/*.ts', '**/*.tsx'],
      extends: [js.configs.recommended, tseslint.configs.recommended],
   },
   {
      files: [
         'apps/api/src/ai/tools/__tests__/endpoint-inventory.fixture.ts',
         'apps/api/src/ai/tools/__tests__/tools-on-disk.fixture.ts',
      ],
      rules: {
         '@typescript-eslint/no-require-imports': 'off',
      },
   },

   {
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: {
         parser: tseslint.parser,
         parserOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
         },
      },
      plugins: {
         '@typescript-eslint': tseslint.plugin,
         import: importPlugin,
         'simple-import-sort': simpleImportSort,
         prettier: prettierPlugin,
      },
      rules: {
         'prettier/prettier': 'error',

         '@typescript-eslint/no-unused-vars': [
            'error',
            { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
         ],
         '@typescript-eslint/no-explicit-any': 'error',
         '@typescript-eslint/consistent-type-imports': [
            'error',
            {
               prefer: 'type-imports',
               fixStyle: 'separate-type-imports',
               disallowTypeAnnotations: false,
            },
         ],
         '@typescript-eslint/no-non-null-assertion': 'error',

         'simple-import-sort/imports': 'error',
         'simple-import-sort/exports': 'error',
         'import/first': 'error',
         'import/newline-after-import': 'error',
         'import/no-duplicates': 'error',
         'import/no-default-export': 'error',

         'no-console': ['error', { allow: ['warn', 'error'] }],
         'no-debugger': 'error',
         'prefer-const': 'error',
         'no-var': 'error',
      },
   },

   {
      files: [
         'apps/web/src/app/**/{page,layout,route,error,global-error,not-found,loading,template,default}.{ts,tsx}',
         'apps/web/src/app/{manifest,robots,sitemap}.ts',
         'apps/web/src/middleware.ts',
         'apps/web/src/i18n/request.ts',
         'apps/*/src/**/*.stories.tsx',
         'apps/*/.storybook/{main.ts,preview.tsx}',
         '**/*.config.{ts,mjs}',
         'apps/api/test/setup/global-{setup,teardown}.ts',
         'apps/admin/src/api/kubbClient.ts',
         'apps/web/src/api/axiosClient.ts',
         'apps/admin/src/@types/svgr.d.ts',
         'apps/web/src/types/svg.d.ts',
      ],
      rules: {
         'import/no-default-export': 'off',
      },
   },

   {
      files: [
         'apps/api/**/*.controller.ts',
         'apps/api/**/*.service.ts',
         'apps/api/**/*.module.ts',
         'apps/api/**/*.guard.ts',
         'apps/api/**/*.filter.ts',
         'apps/api/**/*.interceptor.ts',
         'apps/api/**/*.middleware.ts',
         'apps/api/**/*.tool.ts',
         'apps/api/**/*.provider.ts',
         'apps/api/**/*.processor.ts',
         'apps/api/**/*.queue.ts',
      ],
      rules: {
         '@typescript-eslint/consistent-type-imports': 'off',
      },
   },

   {
      files: ['apps/admin/**/*.{ts,tsx}', 'apps/web/**/*.{ts,tsx}'],
      plugins: {
         react: reactPlugin,
         'react-hooks': reactHooksPlugin,
         'react-refresh': reactRefreshPlugin,
         'jsx-a11y': jsxA11yPlugin,
         sonarjs: sonarjsPlugin,
      },
      settings: {
         react: { version: 'detect' },
      },
      rules: {
         'react/react-in-jsx-scope': 'off',
         'react/prop-types': 'off',
         'react/jsx-no-target-blank': 'error',
         'react/jsx-key': 'error',
         'react/no-unknown-property': 'error',
         'react/self-closing-comp': 'error',

         'react-hooks/rules-of-hooks': 'error',
         'react-hooks/exhaustive-deps': 'error',

         'react-refresh/only-export-components': ['error', { allowConstantExport: true }],

         'jsx-a11y/alt-text': 'error',
         'jsx-a11y/anchor-is-valid': 'error',
         'jsx-a11y/click-events-have-key-events': 'error',
         'jsx-a11y/no-static-element-interactions': 'error',

         'sonarjs/cognitive-complexity': 'error',
         'sonarjs/no-duplicate-string': 'error',
      },
   },

   {
      files: ['apps/web/src/app/**/{page,layout,template,error,loading,not-found,route}.{ts,tsx}'],
      rules: {
         'react-refresh/only-export-components': 'off',
      },
   },

   {
      files: ['apps/admin/src/routes/**/*.tsx'],
      rules: {
         'react-refresh/only-export-components': [
            'error',
            {
               allowConstantExport: true,
               extraHOCs: ['createFileRoute', 'createRootRoute', 'createRootRouteWithContext'],
            },
         ],
      },
   },

   ...['web', 'admin'].map((app) => ({
      files: [`apps/${app}/**/*.{ts,tsx}`],
      settings: {
         'import/extensions': ['.ts', '.tsx'],
         'import/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
         'import/resolver': {
            typescript: { project: [`${import.meta.dirname}/apps/${app}/tsconfig.json`] },
         },
      },
      rules: {
         'import/no-cycle': 'error',
      },
   })),
   {
      files: [
         'apps/web/src/features/runner-game/engine/**/*.ts',
         'apps/web/src/features/runner-game/render/effects.ts',
         'apps/web/src/features/runner-game/render/sprites.ts',
         'apps/web/src/features/runner-game/render/pixelFont.ts',
      ],
      rules: {
         'no-restricted-globals': [
            'error',
            'window',
            'self',
            'globalThis',
            'document',
            'navigator',
            'location',
            'localStorage',
            'sessionStorage',
            'matchMedia',
            'getComputedStyle',
            'performance',
            'requestAnimationFrame',
            'setTimeout',
            'setInterval',
         ],
      },
   },
   {
      files: ['apps/web/src/features/runner-game/**/*.{ts,tsx}'],
      rules: {
         'no-restricted-imports': [
            'error',
            {
               paths: [
                  {
                     name: '@/env',
                     message:
                        'Client code: read NEXT_PUBLIC_ values from process.env; @/env puts zod into the client bundle.',
                  },
               ],
            },
         ],
      },
   },

   prettierConfig,
]);
