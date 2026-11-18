/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectControllerGenerateTranslationMutationRequest,
   ProjectControllerGenerateTranslationMutationResponse,
   ProjectControllerGenerateTranslationPathParams,
   ProjectControllerGenerateTranslation400,
   ProjectControllerGenerateTranslation404,
   ProjectControllerGenerateTranslation429,
   ProjectControllerGenerateTranslation504,
} from '../models/ProjectControllerGenerateTranslation';

function getProjectControllerGenerateTranslationUrl(
   id: ProjectControllerGenerateTranslationPathParams['id'],
   language: ProjectControllerGenerateTranslationPathParams['language'],
) {
   const res = {
      method: 'POST',
      url: `/projects/${id}/translations/${language}/generate` as const,
   };
   return res;
}

export async function projectControllerGenerateTranslation(
   id: ProjectControllerGenerateTranslationPathParams['id'],
   language: ProjectControllerGenerateTranslationPathParams['language'],
   data: ProjectControllerGenerateTranslationMutationRequest,
   config: Partial<RequestConfig<ProjectControllerGenerateTranslationMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerGenerateTranslationMutationResponse,
      ResponseErrorConfig<
         | ProjectControllerGenerateTranslation400
         | ProjectControllerGenerateTranslation404
         | ProjectControllerGenerateTranslation429
         | ProjectControllerGenerateTranslation504
      >,
      ProjectControllerGenerateTranslationMutationRequest
   >({
      method: 'POST',
      url: getProjectControllerGenerateTranslationUrl(id, language).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
