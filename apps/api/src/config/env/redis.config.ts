import { registerAs } from '@nestjs/config';

import { DEFAULT_REDIS_COMMAND_TIMEOUT_MS } from './connection-limits';

export default registerAs('redis', () => {
   const keyPrefix = process.env.REDIS_KEY_PREFIX ? `${process.env.REDIS_KEY_PREFIX}:` : '';
   return {
      url: process.env.REDIS_URL,
      keyPrefix,
      commandTimeout: Number(
         process.env.REDIS_COMMAND_TIMEOUT_MS || DEFAULT_REDIS_COMMAND_TIMEOUT_MS,
      ),
      bullPrefix: keyPrefix ? `${keyPrefix}bull` : undefined,
   };
});
