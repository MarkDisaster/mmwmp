/* eslint-disable */

export const serviceControllerDeleteTranslationPathParamsLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type ServiceControllerDeleteTranslationPathParamsLanguageEnumKey =
   (typeof serviceControllerDeleteTranslationPathParamsLanguageEnum)[keyof typeof serviceControllerDeleteTranslationPathParamsLanguageEnum];

export type ServiceControllerDeleteTranslationPathParams = {
   id: number;
   language: ServiceControllerDeleteTranslationPathParamsLanguageEnumKey;
};

export type ServiceControllerDeleteTranslation204 = any;

export type ServiceControllerDeleteTranslation400 = any;

export type ServiceControllerDeleteTranslation404 = any;

export type ServiceControllerDeleteTranslationMutationResponse =
   ServiceControllerDeleteTranslation204;

export type ServiceControllerDeleteTranslationMutation = {
   Response: ServiceControllerDeleteTranslation204;
   PathParams: ServiceControllerDeleteTranslationPathParams;
   Errors: ServiceControllerDeleteTranslation400 | ServiceControllerDeleteTranslation404;
};
