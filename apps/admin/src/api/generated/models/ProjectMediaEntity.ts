/* eslint-disable */

export const projectMediaEntityLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type ProjectMediaEntityLanguageEnumKey =
   (typeof projectMediaEntityLanguageEnum)[keyof typeof projectMediaEntityLanguageEnum];

export type ProjectMediaEntity = {
   id: number;
   projectId: number;
   fileId: number;
   language: ProjectMediaEntityLanguageEnumKey | null;
   sortOrder: number;
};
