import type { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';

const JSON_BODY_LIMIT = '100kb';

const SAVE_JSON_BODY_LIMIT = '2mb';

const SAVE_ROUTES = [
   '/projects/save',
   '/projects/:id/save',
   '/services/save',
   '/services/:id/save',
] as const;

export const useJsonBodyLimit = (app: NestExpressApplication) => {
   app.use([...SAVE_ROUTES], json({ limit: SAVE_JSON_BODY_LIMIT }));
   app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
};
