/* eslint-disable */

import type { AuthorEntity } from './AuthorEntity';
import type { ServiceProjectEntity } from './ServiceProjectEntity';
import type { ServiceTranslationEntity } from './ServiceTranslationEntity';

export const publicServiceEntityStatusEnum = {
   draft: 'draft',
   published: 'published',
} as const;

export type PublicServiceEntityStatusEnumKey =
   (typeof publicServiceEntityStatusEnum)[keyof typeof publicServiceEntityStatusEnum];

export type PublicServiceEntity = {
   id: number;
   title: string;
   status: PublicServiceEntityStatusEnumKey;
   slug: string;
   sortOrder: number;
   showOnHomepage: boolean;
   publishedAt: string | null;
   createdAt: string;
   updatedAt: string;
   translations: ServiceTranslationEntity[];
   projects: ServiceProjectEntity[];
   createdBy?: AuthorEntity | null;
};
