/* eslint-disable */

export const projectControllerDeleteTranslationPathParamsLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type ProjectControllerDeleteTranslationPathParamsLanguageEnumKey =
   (typeof projectControllerDeleteTranslationPathParamsLanguageEnum)[keyof typeof projectControllerDeleteTranslationPathParamsLanguageEnum];

export type ProjectControllerDeleteTranslationPathParams = {
   id: number;
   language: ProjectControllerDeleteTranslationPathParamsLanguageEnumKey;
};

export type ProjectControllerDeleteTranslation204 = any;

export type ProjectControllerDeleteTranslation400 = any;

export type ProjectControllerDeleteTranslation404 = any;

export type ProjectControllerDeleteTranslationMutationResponse =
   ProjectControllerDeleteTranslation204;

export type ProjectControllerDeleteTranslationMutation = {
   Response: ProjectControllerDeleteTranslation204;
   PathParams: ProjectControllerDeleteTranslationPathParams;
   Errors: ProjectControllerDeleteTranslation400 | ProjectControllerDeleteTranslation404;
};
