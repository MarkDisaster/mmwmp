export const resolveAppEnv = (env: NodeJS.ProcessEnv = process.env): string =>
   env.APP_ENV || env.NODE_ENV || 'development';
