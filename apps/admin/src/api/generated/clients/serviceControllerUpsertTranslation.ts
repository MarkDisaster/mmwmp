/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ServiceControllerUpsertTranslationMutationRequest,
   ServiceControllerUpsertTranslationMutationResponse,
   ServiceControllerUpsertTranslationPathParams,
   ServiceControllerUpsertTranslation404,
   ServiceControllerUpsertTranslation409,
} from '../models/ServiceControllerUpsertTranslation';

function getServiceControllerUpsertTranslationUrl(
   id: ServiceControllerUpsertTranslationPathParams['id'],
   language: ServiceControllerUpsertTranslationPathParams['language'],
) {
   const res = { method: 'POST', url: `/services/${id}/translations/${language}` as const };
   return res;
}

export async function serviceControllerUpsertTranslation(
   id: ServiceControllerUpsertTranslationPathParams['id'],
   language: ServiceControllerUpsertTranslationPathParams['language'],
   data: ServiceControllerUpsertTranslationMutationRequest,
   config: Partial<RequestConfig<ServiceControllerUpsertTranslationMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ServiceControllerUpsertTranslationMutationResponse,
      ResponseErrorConfig<
         ServiceControllerUpsertTranslation404 | ServiceControllerUpsertTranslation409
      >,
      ServiceControllerUpsertTranslationMutationRequest
   >({
      method: 'POST',
      url: getServiceControllerUpsertTranslationUrl(id, language).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
