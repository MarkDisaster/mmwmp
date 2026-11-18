/* eslint-disable */

export const uploadFileBodyDtoLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type UploadFileBodyDtoLanguageEnumKey =
   (typeof uploadFileBodyDtoLanguageEnum)[keyof typeof uploadFileBodyDtoLanguageEnum];

export type UploadFileBodyDto = {
   displayName?: string;
   language?: UploadFileBodyDtoLanguageEnumKey;
   file: Blob;
};
