import type { ConfigService } from '@nestjs/config';

import { RevalidationService } from '../revalidation.service';

describe('RevalidationService.revalidateNow', () => {
   const config = (values: Record<string, string | undefined>) =>
      ({ get: (key: string) => values[key] }) as unknown as ConfigService;
   const configured = { 'app.webUrl': 'https://web.test/', 'app.revalidateSecret': 's3cret' };
   const fetchMock = jest.fn();

   beforeEach(() => {
      fetchMock.mockReset();
      global.fetch = fetchMock as unknown as typeof fetch;
   });

   it('posts each tag once to /api/revalidate with the secret and reports success', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });
      const service = new RevalidationService(config(configured));

      const results = await service.revalidateNow(['projects', 'projects', 'tags']);

      expect(results).toEqual([
         { tag: 'projects', revalidated: true },
         { tag: 'tags', revalidated: true },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe('https://web.test/api/revalidate');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
         tag: 'projects',
         secret: 's3cret',
      });
   });

   it('reports the status of a refusal without the body or the secret', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 401, text: () => Promise.resolve('nope') });
      const service = new RevalidationService(config(configured));

      expect(await service.revalidateNow(['services'])).toEqual([
         { tag: 'services', revalidated: false, reason: 'the web answered 401' },
      ]);
   });

   it('reports a network failure and a missing configuration, never throws', async () => {
      fetchMock.mockRejectedValue(new Error('timeout'));
      expect(await new RevalidationService(config(configured)).revalidateNow(['contact'])).toEqual([
         { tag: 'contact', revalidated: false, reason: 'the web did not answer in time' },
      ]);

      const unconfigured = new RevalidationService(config({}));
      const [result] = await unconfigured.revalidateNow(['contact']);
      expect(result.revalidated).toBe(false);
      expect(result.reason).toContain('not configured');
   });
});
