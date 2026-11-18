/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ProjectControllerDeleteTranslationMutationResponse,
   ProjectControllerDeleteTranslationPathParams,
   ProjectControllerDeleteTranslation400,
   ProjectControllerDeleteTranslation404,
} from '../models/ProjectControllerDeleteTranslation';

function getProjectControllerDeleteTranslationUrl(
   id: ProjectControllerDeleteTranslationPathParams['id'],
   language: ProjectControllerDeleteTranslationPathParams['language'],
) {
   const res = { method: 'DELETE', url: `/projects/${id}/translations/${language}` as const };
   return res;
}

export async function projectControllerDeleteTranslation(
   id: ProjectControllerDeleteTranslationPathParams['id'],
   language: ProjectControllerDeleteTranslationPathParams['language'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectControllerDeleteTranslationMutationResponse,
      ResponseErrorConfig<
         ProjectControllerDeleteTranslation400 | ProjectControllerDeleteTranslation404
      >,
      unknown
   >({
      method: 'DELETE',
      url: getProjectControllerDeleteTranslationUrl(id, language).url.toString(),
      ...requestConfig,
   });
   return res;
}
