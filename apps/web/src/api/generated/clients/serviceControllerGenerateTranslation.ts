/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServiceControllerGenerateTranslationMutationRequest,
   ServiceControllerGenerateTranslationMutationResponse,
   ServiceControllerGenerateTranslationPathParams,
   ServiceControllerGenerateTranslation400,
   ServiceControllerGenerateTranslation404,
   ServiceControllerGenerateTranslation429,
   ServiceControllerGenerateTranslation504,
} from '../models/ServiceControllerGenerateTranslation';

function getServiceControllerGenerateTranslationUrl(
   id: ServiceControllerGenerateTranslationPathParams['id'],
   language: ServiceControllerGenerateTranslationPathParams['language'],
) {
   const res = {
      method: 'POST',
      url: `/services/${id}/translations/${language}/generate` as const,
   };
   return res;
}

export async function serviceControllerGenerateTranslation(
   id: ServiceControllerGenerateTranslationPathParams['id'],
   language: ServiceControllerGenerateTranslationPathParams['language'],
   data: ServiceControllerGenerateTranslationMutationRequest,
   config: Partial<RequestConfig<ServiceControllerGenerateTranslationMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ServiceControllerGenerateTranslationMutationResponse,
      ResponseErrorConfig<
         | ServiceControllerGenerateTranslation400
         | ServiceControllerGenerateTranslation404
         | ServiceControllerGenerateTranslation429
         | ServiceControllerGenerateTranslation504
      >,
      ServiceControllerGenerateTranslationMutationRequest
   >({
      method: 'POST',
      url: getServiceControllerGenerateTranslationUrl(id, language).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
