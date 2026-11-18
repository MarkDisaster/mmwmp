/* eslint-disable */

export const tagTranslationDtoLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type TagTranslationDtoLanguageEnumKey =
   (typeof tagTranslationDtoLanguageEnum)[keyof typeof tagTranslationDtoLanguageEnum];

export type TagTranslationDto = {
   language: TagTranslationDtoLanguageEnumKey;
   name: string;
};
