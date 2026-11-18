/* eslint-disable */

import type { TagTranslationDto } from './TagTranslationDto';

export type CreateTagDto = {
   slug: string;
   color?: string;
   translations: TagTranslationDto[];
};
