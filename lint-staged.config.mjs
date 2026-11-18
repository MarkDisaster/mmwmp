const quote = (files) => files.map((file) => `"${file}"`).join(' ');

const lintApp = (app) => (files) => [
   `prettier --write ${quote(files)}`,
   `pnpm --dir apps/${app} exec eslint --fix --max-warnings 0 --no-warn-ignored ${quote(files)}`,
];

const config = {
   'apps/web/src/**/*.{ts,tsx}': lintApp('web'),
   'apps/admin/src/**/*.{ts,tsx}': lintApp('admin'),
   'apps/api/{src,test}/**/*.ts': lintApp('api'),
   'packages/**/*.{ts,tsx}': (files) => `prettier --write ${quote(files)}`,
   './*.ts': (files) => `prettier --write ${quote(files)}`,
   '*.{json,jsonc,md,yml,yaml,css,mjs}': 'prettier --write --ignore-unknown',
};

export default config;
