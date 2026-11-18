/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ServiceTranslationEntity } from './ServiceTranslationEntity';
import type { UpsertServiceTranslationDto } from './UpsertServiceTranslationDto';

export const serviceControllerUpsertTranslationPathParamsLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type ServiceControllerUpsertTranslationPathParamsLanguageEnumKey =
   (typeof serviceControllerUpsertTranslationPathParamsLanguageEnum)[keyof typeof serviceControllerUpsertTranslationPathParamsLanguageEnum];

export type ServiceControllerUpsertTranslationPathParams = {
   id: number;
   language: ServiceControllerUpsertTranslationPathParamsLanguageEnumKey;
};

export type ServiceControllerUpsertTranslation201 = ServiceTranslationEntity;

export type ServiceControllerUpsertTranslation404 = any;

export type ServiceControllerUpsertTranslation409 = ErrorResponseDto;

export type ServiceControllerUpsertTranslationMutationRequest = UpsertServiceTranslationDto;

export type ServiceControllerUpsertTranslationMutationResponse =
   ServiceControllerUpsertTranslation201;

export type ServiceControllerUpsertTranslationMutation = {
   Response: ServiceControllerUpsertTranslation201;
   Request: ServiceControllerUpsertTranslationMutationRequest;
   PathParams: ServiceControllerUpsertTranslationPathParams;
   Errors: ServiceControllerUpsertTranslation404 | ServiceControllerUpsertTranslation409;
};
