/* eslint-disable */

import type { GenerateProjectTranslationRequestDto } from './GenerateProjectTranslationRequestDto';
import type { GenerateProjectTranslationResponseDto } from './GenerateProjectTranslationResponseDto';

export const projectControllerGenerateTranslationPathParamsLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type ProjectControllerGenerateTranslationPathParamsLanguageEnumKey =
   (typeof projectControllerGenerateTranslationPathParamsLanguageEnum)[keyof typeof projectControllerGenerateTranslationPathParamsLanguageEnum];

export type ProjectControllerGenerateTranslationPathParams = {
   id: number;
   language: ProjectControllerGenerateTranslationPathParamsLanguageEnumKey;
};

export type ProjectControllerGenerateTranslation201 = GenerateProjectTranslationResponseDto;

export type ProjectControllerGenerateTranslation400 = any;

export type ProjectControllerGenerateTranslation404 = any;

export type ProjectControllerGenerateTranslation429 = any;

export type ProjectControllerGenerateTranslation504 = any;

export type ProjectControllerGenerateTranslationMutationRequest =
   GenerateProjectTranslationRequestDto;

export type ProjectControllerGenerateTranslationMutationResponse =
   ProjectControllerGenerateTranslation201;

export type ProjectControllerGenerateTranslationMutation = {
   Response: ProjectControllerGenerateTranslation201;
   Request: ProjectControllerGenerateTranslationMutationRequest;
   PathParams: ProjectControllerGenerateTranslationPathParams;
   Errors:
      | ProjectControllerGenerateTranslation400
      | ProjectControllerGenerateTranslation404
      | ProjectControllerGenerateTranslation429
      | ProjectControllerGenerateTranslation504;
};
