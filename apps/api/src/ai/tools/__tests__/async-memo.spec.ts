import { AsyncMemo } from '../async-memo';

describe('AsyncMemo', () => {
   it('runs the computation once per key and gives every later caller the same result', async () => {
      const memo = new AsyncMemo();
      const produce = jest.fn(() => Promise.resolve({ value: 1 }));

      const first = await memo.run('k', produce);
      const again = await memo.run('k', produce);
      await memo.run('other', produce);

      expect(again).toBe(first);
      expect(produce).toHaveBeenCalledTimes(2);
   });

   it('runs it once for concurrent callers of one key', async () => {
      const memo = new AsyncMemo();
      const produce = jest.fn(() => Promise.resolve('v'));

      await Promise.all([memo.run('k', produce), memo.run('k', produce)]);

      expect(produce).toHaveBeenCalledTimes(1);
   });

   it('does not keep a rejected result, so the next call can succeed', async () => {
      const memo = new AsyncMemo();
      const produce = jest
         .fn<Promise<string>, []>()
         .mockRejectedValueOnce(new Error('db down'))
         .mockResolvedValue('ok');

      await expect(memo.run('k', produce)).rejects.toThrow('db down');
      expect(await memo.run('k', produce)).toBe('ok');
      expect(await memo.run('k', produce)).toBe('ok');

      expect(produce).toHaveBeenCalledTimes(2);
   });
});
