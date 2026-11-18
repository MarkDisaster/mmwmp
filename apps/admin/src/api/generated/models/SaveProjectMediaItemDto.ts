/* eslint-disable */

export const saveProjectMediaItemDtoLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type SaveProjectMediaItemDtoLanguageEnumKey =
   (typeof saveProjectMediaItemDtoLanguageEnum)[keyof typeof saveProjectMediaItemDtoLanguageEnum];

export type SaveProjectMediaItemDto = {
   id?: number;
   fileId?: number;
   language?: SaveProjectMediaItemDtoLanguageEnumKey | null;
};
