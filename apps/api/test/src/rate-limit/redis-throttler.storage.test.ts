import { RedisThrottlerStorage } from '../../../src/rate-limit/redis-throttler.storage';
import { getApp } from '../../setup/init';

describe('RedisThrottlerStorage (e2e)', () => {
   const increment = (tracker: string) =>
      getApp().get(RedisThrottlerStorage).increment(tracker, 60_000, 2, 30_000, 'default');

   it('blocks a tracker over the limit for the block duration without counting further', async () => {
      await increment('a');
      expect(await increment('a')).toMatchObject({ totalHits: 2, isBlocked: false });

      expect(await increment('a')).toMatchObject({
         totalHits: 3,
         isBlocked: true,
         timeToBlockExpire: 30,
      });
      expect(await increment('a')).toMatchObject({ totalHits: 3, isBlocked: true });
   });

   it('starts counting from zero when the block ends', async () => {
      const storage = getApp().get(RedisThrottlerStorage);
      const hit = () => storage.increment('c', 60_000, 1, 200, 'default');
      await hit();
      expect(await hit()).toMatchObject({ isBlocked: true });

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(await hit()).toMatchObject({ totalHits: 1, isBlocked: false });
   });

   it('counts every tracker on its own', async () => {
      await increment('a');
      await increment('a');

      expect(await increment('b')).toMatchObject({ totalHits: 1, isBlocked: false });
   });
});
