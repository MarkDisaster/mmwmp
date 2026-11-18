/* eslint-disable */

import type { AuthorEntity } from './AuthorEntity';
import type { TagTranslationEntity } from './TagTranslationEntity';

export type TagEntity = {
   id: number;
   translations: TagTranslationEntity[];
   slug: string;
   color: string | null;
   sortOrder: number;
   createdAt: string;
   updatedAt: string;
   version: number;
   createdBy?: AuthorEntity | null;
};
