import { createHash, timingSafeEqual } from 'node:crypto';

import type { NextFunction, Request, RequestHandler, Response } from 'express';

export type SwaggerCredentials = { username: string; password: string };

const MAX_HEADER_LENGTH = 1024;
const BASIC_HEADER = /^basic +([A-Za-z0-9+/]+={0,2})$/i;

const digest = (value: string) => createHash('sha256').update(value).digest();

const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

export const createSwaggerBasicAuth = ({
   username,
   password,
}: SwaggerCredentials): RequestHandler => {
   const challenge = (res: Response) => {
      res.setHeader('WWW-Authenticate', 'Basic realm="API docs", charset="UTF-8"');
      res.status(401).end();
   };

   return (req: Request, res: Response, next: NextFunction) => {
      const header = req.headers.authorization;
      const match = header && header.length <= MAX_HEADER_LENGTH ? BASIC_HEADER.exec(header) : null;
      if (!match) {
         challenge(res);
         return;
      }

      const decoded = Buffer.from(match[1], 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator === -1) {
         challenge(res);
         return;
      }

      const userMatches = safeEqual(decoded.slice(0, separator), username);
      const passwordMatches = safeEqual(decoded.slice(separator + 1), password);
      if (userMatches && passwordMatches) {
         next();
         return;
      }
      challenge(res);
   };
};
