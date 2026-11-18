import { z } from 'zod';

import { isHttpUrl, MAX_URL_LENGTH } from '@/common/decorators/is-http-url.decorator';

export const httpUrlSchema = z
   .string()
   .trim()
   .max(MAX_URL_LENGTH)
   .refine(
      isHttpUrl,
      'Must be an absolute http(s) URL with a domain name (no IP address, no localhost, no spaces).',
   );
