/* eslint-disable */

export const tagTranslationEntityLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type TagTranslationEntityLanguageEnumKey =
   (typeof tagTranslationEntityLanguageEnum)[keyof typeof tagTranslationEntityLanguageEnum];

export type TagTranslationEntity = {
   language: TagTranslationEntityLanguageEnumKey;
   name: string;
};
