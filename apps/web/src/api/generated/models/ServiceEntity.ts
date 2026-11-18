/* eslint-disable */

import type { AuthorEntity } from './AuthorEntity';
import type { ServiceProjectEntity } from './ServiceProjectEntity';
import type { ServiceTranslationEntity } from './ServiceTranslationEntity';

export const serviceEntityStatusEnum = {
   draft: 'draft',
   published: 'published',
} as const;

export type ServiceEntityStatusEnumKey =
   (typeof serviceEntityStatusEnum)[keyof typeof serviceEntityStatusEnum];

export type ServiceEntity = {
   id: number;
   title: string;
   status: ServiceEntityStatusEnumKey;
   slug: string;
   sortOrder: number;
   showOnHomepage: boolean;
   publishedAt: string | null;
   createdAt: string;
   updatedAt: string;
   version: number;
   translations: ServiceTranslationEntity[];
   projects: ServiceProjectEntity[];
   createdBy?: AuthorEntity | null;
};
