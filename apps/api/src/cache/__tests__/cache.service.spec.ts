import type IORedis from 'ioredis';

import { CacheService } from '../cache.service';

const redisWith = (keyPrefix: string | undefined, stored: string[]) => {
   const redis = {
      options: { keyPrefix },
      scan: jest.fn().mockResolvedValue(['0', stored]),
      del: jest.fn(),
   };
   return { redis, cache: new CacheService(redis as unknown as IORedis) };
};

describe('CacheService.delPattern', () => {
   it('scans and deletes the keys as they are without a key prefix', async () => {
      const { redis, cache } = redisWith(undefined, ['projects:list', 'projects:detail']);

      await cache.delPattern('projects:*');

      expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'projects:*', 'COUNT', 1000);
      expect(redis.del).toHaveBeenCalledWith('projects:list', 'projects:detail');
   });

   it('adds the key prefix to the pattern and deletes the names without it (DEL adds it again)', async () => {
      const { redis, cache } = redisWith('staging:', ['staging:projects:list']);

      await cache.delPattern('projects:*');

      expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'staging:projects:*', 'COUNT', 1000);
      expect(redis.del).toHaveBeenCalledWith('projects:list');
   });

   it('follows the cursor until SCAN is done', async () => {
      const { redis, cache } = redisWith('', []);
      redis.scan.mockResolvedValueOnce(['17', ['a']]).mockResolvedValueOnce(['0', ['b']]);

      await cache.delPattern('*');

      expect(redis.scan).toHaveBeenCalledTimes(2);
      expect(redis.scan).toHaveBeenLastCalledWith('17', 'MATCH', '*', 'COUNT', 1000);
      expect(redis.del).toHaveBeenNthCalledWith(2, 'b');
   });
});
