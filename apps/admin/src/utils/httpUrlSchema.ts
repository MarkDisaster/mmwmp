import i18next from 'i18next';
import { z } from 'zod/v4';

import { isHttpUrl } from '@/utils/url';

export const httpUrlSchema = z
   .string()
   .refine((value) => value.trim() === '' || isHttpUrl(value.trim()), {
      error: () => i18next.t('validation.urlInvalid'),
   });
