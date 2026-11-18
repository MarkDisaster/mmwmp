/* eslint-disable */

import type { AuthorEntity } from './AuthorEntity';
import type { FileEntity } from './FileEntity';
import type { ProjectLinkEntity } from './ProjectLinkEntity';
import type { ProjectMediaEntity } from './ProjectMediaEntity';
import type { ProjectTagEntity } from './ProjectTagEntity';
import type { ProjectTranslationEntity } from './ProjectTranslationEntity';

export const projectEntityStatusEnum = {
   draft: 'draft',
   published: 'published',
} as const;

export type ProjectEntityStatusEnumKey =
   (typeof projectEntityStatusEnum)[keyof typeof projectEntityStatusEnum];

export type ProjectEntity = {
   id: number;
   title: string;
   status: ProjectEntityStatusEnumKey;
   company: string | null;
   startYear: number | null;
   endYear: number | null;
   ongoing: boolean;
   slug: string;
   thumbnailId: number | null;
   thumbnail?: FileEntity | null;
   createdById: number | null;
   createdBy?: AuthorEntity | null;
   sortOrder: number;
   showOnHomepage: boolean;
   publishedAt: string | null;
   createdAt: string;
   updatedAt: string;
   version: number;
   translations: ProjectTranslationEntity[];
   tags: ProjectTagEntity[];
   links: ProjectLinkEntity[];
   media: ProjectMediaEntity[];
};
