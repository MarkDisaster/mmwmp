/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ServiceControllerDeleteTranslationMutationResponse,
   ServiceControllerDeleteTranslationPathParams,
   ServiceControllerDeleteTranslation400,
   ServiceControllerDeleteTranslation404,
} from '../models/ServiceControllerDeleteTranslation';

function getServiceControllerDeleteTranslationUrl(
   id: ServiceControllerDeleteTranslationPathParams['id'],
   language: ServiceControllerDeleteTranslationPathParams['language'],
) {
   const res = { method: 'DELETE', url: `/services/${id}/translations/${language}` as const };
   return res;
}

export async function serviceControllerDeleteTranslation(
   id: ServiceControllerDeleteTranslationPathParams['id'],
   language: ServiceControllerDeleteTranslationPathParams['language'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ServiceControllerDeleteTranslationMutationResponse,
      ResponseErrorConfig<
         ServiceControllerDeleteTranslation400 | ServiceControllerDeleteTranslation404
      >,
      unknown
   >({
      method: 'DELETE',
      url: getServiceControllerDeleteTranslationUrl(id, language).url.toString(),
      ...requestConfig,
   });
   return res;
}
