/* eslint-disable */

import type { TagTranslationDto } from './TagTranslationDto';

export type UpdateTagDto = {
   slug?: string;
   color?: string;
   translations?: TagTranslationDto[];
   version?: number;
};
