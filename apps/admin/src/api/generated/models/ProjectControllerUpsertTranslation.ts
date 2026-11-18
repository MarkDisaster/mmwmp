/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ProjectTranslationEntity } from './ProjectTranslationEntity';
import type { UpsertTranslationDto } from './UpsertTranslationDto';

export const projectControllerUpsertTranslationPathParamsLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type ProjectControllerUpsertTranslationPathParamsLanguageEnumKey =
   (typeof projectControllerUpsertTranslationPathParamsLanguageEnum)[keyof typeof projectControllerUpsertTranslationPathParamsLanguageEnum];

export type ProjectControllerUpsertTranslationPathParams = {
   id: number;
   language: ProjectControllerUpsertTranslationPathParamsLanguageEnumKey;
};

export type ProjectControllerUpsertTranslation201 = ProjectTranslationEntity;

export type ProjectControllerUpsertTranslation404 = any;

export type ProjectControllerUpsertTranslation409 = ErrorResponseDto;

export type ProjectControllerUpsertTranslationMutationRequest = UpsertTranslationDto;

export type ProjectControllerUpsertTranslationMutationResponse =
   ProjectControllerUpsertTranslation201;

export type ProjectControllerUpsertTranslationMutation = {
   Response: ProjectControllerUpsertTranslation201;
   Request: ProjectControllerUpsertTranslationMutationRequest;
   PathParams: ProjectControllerUpsertTranslationPathParams;
   Errors: ProjectControllerUpsertTranslation404 | ProjectControllerUpsertTranslation409;
};
