/* eslint-disable */

export const createServiceDtoLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type CreateServiceDtoLanguageEnumKey =
   (typeof createServiceDtoLanguageEnum)[keyof typeof createServiceDtoLanguageEnum];

export type CreateServiceDto = {
   title: string;
   slug: string;
   language: CreateServiceDtoLanguageEnumKey;
   description?: string;
   content?: string;
};
