/* eslint-disable */

export const upsertContactTranslationDtoLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type UpsertContactTranslationDtoLanguageEnumKey =
   (typeof upsertContactTranslationDtoLanguageEnum)[keyof typeof upsertContactTranslationDtoLanguageEnum];

export type UpsertContactTranslationDto = {
   language: UpsertContactTranslationDtoLanguageEnumKey;
   description?: string | null;
   aboutTitle?: string | null;
};
