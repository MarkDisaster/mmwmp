/* eslint-disable */

import type { GenerateServiceTranslationRequestDto } from './GenerateServiceTranslationRequestDto';
import type { GenerateServiceTranslationResponseDto } from './GenerateServiceTranslationResponseDto';

export const serviceControllerGenerateTranslationPathParamsLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type ServiceControllerGenerateTranslationPathParamsLanguageEnumKey =
   (typeof serviceControllerGenerateTranslationPathParamsLanguageEnum)[keyof typeof serviceControllerGenerateTranslationPathParamsLanguageEnum];

export type ServiceControllerGenerateTranslationPathParams = {
   id: number;
   language: ServiceControllerGenerateTranslationPathParamsLanguageEnumKey;
};

export type ServiceControllerGenerateTranslation201 = GenerateServiceTranslationResponseDto;

export type ServiceControllerGenerateTranslation400 = any;

export type ServiceControllerGenerateTranslation404 = any;

export type ServiceControllerGenerateTranslation429 = any;

export type ServiceControllerGenerateTranslation504 = any;

export type ServiceControllerGenerateTranslationMutationRequest =
   GenerateServiceTranslationRequestDto;

export type ServiceControllerGenerateTranslationMutationResponse =
   ServiceControllerGenerateTranslation201;

export type ServiceControllerGenerateTranslationMutation = {
   Response: ServiceControllerGenerateTranslation201;
   Request: ServiceControllerGenerateTranslationMutationRequest;
   PathParams: ServiceControllerGenerateTranslationPathParams;
   Errors:
      | ServiceControllerGenerateTranslation400
      | ServiceControllerGenerateTranslation404
      | ServiceControllerGenerateTranslation429
      | ServiceControllerGenerateTranslation504;
};
