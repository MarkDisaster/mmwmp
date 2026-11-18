import redisConfig from '../redis.config';

describe('redis config — REDIS_KEY_PREFIX', () => {
   const original = process.env.REDIS_KEY_PREFIX;
   afterEach(() => {
      if (original === undefined) delete process.env.REDIS_KEY_PREFIX;
      else process.env.REDIS_KEY_PREFIX = original;
   });

   it('keeps the keys as before when it is unset or empty', () => {
      for (const value of [undefined, '']) {
         if (value === undefined) delete process.env.REDIS_KEY_PREFIX;
         else process.env.REDIS_KEY_PREFIX = value;
         expect(redisConfig()).toMatchObject({ keyPrefix: '', bullPrefix: undefined });
      }
   });

   it('namespaces the client keys and the queues', () => {
      process.env.REDIS_KEY_PREFIX = 'staging';
      expect(redisConfig()).toMatchObject({ keyPrefix: 'staging:', bullPrefix: 'staging:bull' });
   });
});

describe('redis config — REDIS_COMMAND_TIMEOUT_MS', () => {
   const original = process.env.REDIS_COMMAND_TIMEOUT_MS;
   afterEach(() => {
      if (original === undefined) delete process.env.REDIS_COMMAND_TIMEOUT_MS;
      else process.env.REDIS_COMMAND_TIMEOUT_MS = original;
   });

   it('bounds every command at 1000 ms unless set', () => {
      delete process.env.REDIS_COMMAND_TIMEOUT_MS;
      expect(redisConfig().commandTimeout).toBe(1000);
      process.env.REDIS_COMMAND_TIMEOUT_MS = '300';
      expect(redisConfig().commandTimeout).toBe(300);
      process.env.REDIS_COMMAND_TIMEOUT_MS = '1e3';
      expect(redisConfig().commandTimeout).toBe(1000);
   });
});
