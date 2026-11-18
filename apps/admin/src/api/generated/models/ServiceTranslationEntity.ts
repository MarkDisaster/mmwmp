/* eslint-disable */

export const serviceTranslationEntityLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type ServiceTranslationEntityLanguageEnumKey =
   (typeof serviceTranslationEntityLanguageEnum)[keyof typeof serviceTranslationEntityLanguageEnum];

export type ServiceTranslationEntity = {
   id: number;
   serviceId: number;
   language: ServiceTranslationEntityLanguageEnumKey;
   title: string;
   description?: string | null;
   content?: string | null;
   metaTitle?: string | null;
   metaDescription?: string | null;
};
