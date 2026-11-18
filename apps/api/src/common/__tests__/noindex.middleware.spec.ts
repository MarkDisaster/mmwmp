import type { Request, Response } from 'express';

import { noIndexMiddleware } from '../noindex.middleware';

describe('noIndexMiddleware', () => {
   it('sets X-Robots-Tag and calls next', () => {
      const setHeader = jest.fn();
      const next = jest.fn();
      noIndexMiddleware({} as Request, { setHeader } as unknown as Response, next);
      expect(setHeader).toHaveBeenCalledWith('X-Robots-Tag', 'noindex, nofollow');
      expect(next).toHaveBeenCalledTimes(1);
   });
});
