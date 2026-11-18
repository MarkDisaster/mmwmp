/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectControllerUpsertTranslationMutationRequest,
   ProjectControllerUpsertTranslationMutationResponse,
   ProjectControllerUpsertTranslationPathParams,
   ProjectControllerUpsertTranslation404,
   ProjectControllerUpsertTranslation409,
} from '../models/ProjectControllerUpsertTranslation';

function getProjectControllerUpsertTranslationUrl(
   id: ProjectControllerUpsertTranslationPathParams['id'],
   language: ProjectControllerUpsertTranslationPathParams['language'],
) {
   const res = { method: 'POST', url: `/projects/${id}/translations/${language}` as const };
   return res;
}

export async function projectControllerUpsertTranslation(
   id: ProjectControllerUpsertTranslationPathParams['id'],
   language: ProjectControllerUpsertTranslationPathParams['language'],
   data: ProjectControllerUpsertTranslationMutationRequest,
   config: Partial<RequestConfig<ProjectControllerUpsertTranslationMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerUpsertTranslationMutationResponse,
      ResponseErrorConfig<
         ProjectControllerUpsertTranslation404 | ProjectControllerUpsertTranslation409
      >,
      ProjectControllerUpsertTranslationMutationRequest
   >({
      method: 'POST',
      url: getProjectControllerUpsertTranslationUrl(id, language).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
