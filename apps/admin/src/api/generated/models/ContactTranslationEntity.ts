/* eslint-disable */

export const contactTranslationEntityLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type ContactTranslationEntityLanguageEnumKey =
   (typeof contactTranslationEntityLanguageEnum)[keyof typeof contactTranslationEntityLanguageEnum];

export type ContactTranslationEntity = {
   id: number;
   contactId: number;
   language: ContactTranslationEntityLanguageEnumKey;
   description?: string | null;
   aboutTitle?: string | null;
};
