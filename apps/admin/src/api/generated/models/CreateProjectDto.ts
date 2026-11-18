/* eslint-disable */

export const createProjectDtoLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type CreateProjectDtoLanguageEnumKey =
   (typeof createProjectDtoLanguageEnum)[keyof typeof createProjectDtoLanguageEnum];

export type CreateProjectDto = {
   title: string;
   slug: string;
   language: CreateProjectDtoLanguageEnumKey;
   role?: string;
   description?: string;
   content?: string;
   metaTitle?: string;
   metaDescription?: string;
};
