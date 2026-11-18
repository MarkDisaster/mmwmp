/* eslint-disable */

export const saveServiceTranslationDtoLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type SaveServiceTranslationDtoLanguageEnumKey =
   (typeof saveServiceTranslationDtoLanguageEnum)[keyof typeof saveServiceTranslationDtoLanguageEnum];

export type SaveServiceTranslationDto = {
   language: SaveServiceTranslationDtoLanguageEnumKey;
   title: string;
   description?: string | null;
   content?: string | null;
   metaTitle?: string | null;
   metaDescription?: string | null;
};
