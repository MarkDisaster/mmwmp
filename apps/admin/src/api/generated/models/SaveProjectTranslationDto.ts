/* eslint-disable */

export const saveProjectTranslationDtoLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type SaveProjectTranslationDtoLanguageEnumKey =
   (typeof saveProjectTranslationDtoLanguageEnum)[keyof typeof saveProjectTranslationDtoLanguageEnum];

export type SaveProjectTranslationDto = {
   language: SaveProjectTranslationDtoLanguageEnumKey;
   title: string;
   role?: string | null;
   description?: string | null;
   content?: string | null;
   metaTitle?: string | null;
   metaDescription?: string | null;
};
