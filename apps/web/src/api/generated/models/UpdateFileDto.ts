/* eslint-disable */

export const updateFileDtoLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type UpdateFileDtoLanguageEnumKey =
   (typeof updateFileDtoLanguageEnum)[keyof typeof updateFileDtoLanguageEnum];

export type UpdateFileDto = {
   displayName?: string | null;
   altText?: string | null;
   language?: UpdateFileDtoLanguageEnumKey | null;
   version?: number;
};
