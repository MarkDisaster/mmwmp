/* eslint-disable */

import type { SaveServiceTranslationDto } from './SaveServiceTranslationDto';

export const saveServiceDtoStatusEnum = {
   draft: 'draft',
   published: 'published',
} as const;

export type SaveServiceDtoStatusEnumKey =
   (typeof saveServiceDtoStatusEnum)[keyof typeof saveServiceDtoStatusEnum];

export type SaveServiceDto = {
   slug: string;
   showOnHomepage: boolean;
   status?: SaveServiceDtoStatusEnumKey;
   translations: SaveServiceTranslationDto[];
   projectIds: number[];
   version?: number;
};
