import type { NextFunction, Request, Response } from 'express';

export const noIndexMiddleware = (_req: Request, res: Response, next: NextFunction) => {
   res.setHeader('X-Robots-Tag', 'noindex, nofollow');
   next();
};
