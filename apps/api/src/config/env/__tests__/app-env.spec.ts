import { resolveAppEnv } from '../app-env';

describe('resolveAppEnv', () => {
   it('takes APP_ENV when it is set', () => {
      expect(resolveAppEnv({ APP_ENV: 'staging', NODE_ENV: 'production' })).toBe('staging');
   });

   it('falls back to NODE_ENV, and to development without either', () => {
      expect(resolveAppEnv({ NODE_ENV: 'production' })).toBe('production');
      expect(resolveAppEnv({ NODE_ENV: 'test' })).toBe('test');
      expect(resolveAppEnv({})).toBe('development');
      expect(resolveAppEnv({ APP_ENV: '', NODE_ENV: 'production' })).toBe('production');
   });
});
