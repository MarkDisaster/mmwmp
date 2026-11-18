/* eslint-disable */

export const addProjectMediaDtoLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type AddProjectMediaDtoLanguageEnumKey =
   (typeof addProjectMediaDtoLanguageEnum)[keyof typeof addProjectMediaDtoLanguageEnum];

export type AddProjectMediaDto = {
   fileId: number;
   language?: AddProjectMediaDtoLanguageEnumKey;
   sortOrder?: number;
   version?: number;
};
