/* eslint-disable */

import type { AuthorEntity } from './AuthorEntity';
import type { TagTranslationEntity } from './TagTranslationEntity';

export type PublicTagEntity = {
   id: number;
   translations: TagTranslationEntity[];
   slug: string;
   color: string | null;
   sortOrder: number;
   createdAt: string;
   updatedAt: string;
   createdBy?: AuthorEntity | null;
};
