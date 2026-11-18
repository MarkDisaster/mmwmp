/* eslint-disable */

import type { ProjectLinkEntity } from './ProjectLinkEntity';
import type { ProjectTranslationEntity } from './ProjectTranslationEntity';
import type { PublicFileEntity } from './PublicFileEntity';
import type { PublicProjectMediaEntity } from './PublicProjectMediaEntity';
import type { PublicProjectTagEntity } from './PublicProjectTagEntity';

export const publicProjectEntityStatusEnum = {
   draft: 'draft',
   published: 'published',
} as const;

export type PublicProjectEntityStatusEnumKey =
   (typeof publicProjectEntityStatusEnum)[keyof typeof publicProjectEntityStatusEnum];

export type PublicProjectEntity = {
   id: number;
   title: string;
   status: PublicProjectEntityStatusEnumKey;
   company: string | null;
   startYear: number | null;
   endYear: number | null;
   ongoing: boolean;
   slug: string;
   thumbnailId: number | null;
   sortOrder: number;
   showOnHomepage: boolean;
   publishedAt: string | null;
   createdAt: string;
   updatedAt: string;
   translations: ProjectTranslationEntity[];
   links: ProjectLinkEntity[];
   tags: PublicProjectTagEntity[];
   thumbnail: PublicFileEntity | null;
   media: PublicProjectMediaEntity[];
};
