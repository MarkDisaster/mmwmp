/* eslint-disable */

import type { ProjectLinkDto } from './ProjectLinkDto';
import type { SaveProjectMediaItemDto } from './SaveProjectMediaItemDto';
import type { SaveProjectTranslationDto } from './SaveProjectTranslationDto';

export const saveProjectDtoStatusEnum = {
   draft: 'draft',
   published: 'published',
} as const;

export type SaveProjectDtoStatusEnumKey =
   (typeof saveProjectDtoStatusEnum)[keyof typeof saveProjectDtoStatusEnum];

export type SaveProjectDto = {
   slug: string;
   thumbnailId: number | null;
   showOnHomepage: boolean;
   company: string | null;
   startYear: number | null;
   endYear: number | null;
   ongoing?: boolean;
   translations: SaveProjectTranslationDto[];
   tagIds: number[];
   links: ProjectLinkDto[];
   media: SaveProjectMediaItemDto[];
   status?: SaveProjectDtoStatusEnumKey;
   version?: number;
};
