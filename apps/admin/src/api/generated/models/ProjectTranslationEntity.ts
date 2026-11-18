/* eslint-disable */

export const projectTranslationEntityLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type ProjectTranslationEntityLanguageEnumKey =
   (typeof projectTranslationEntityLanguageEnum)[keyof typeof projectTranslationEntityLanguageEnum];

export type ProjectTranslationEntity = {
   id: number;
   projectId: number;
   language: ProjectTranslationEntityLanguageEnumKey;
   title: string;
   role?: string | null;
   description?: string | null;
   content?: string | null;
   metaTitle?: string | null;
   metaDescription?: string | null;
};
