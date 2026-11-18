/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   TagControllerCreateMutationRequest,
   TagControllerCreateMutationResponse,
   TagControllerCreate409,
} from '../models/TagControllerCreate';

function getTagControllerCreateUrl() {
   const res = { method: 'POST', url: `/tags` as const };
   return res;
}

export async function tagControllerCreate(
   data: TagControllerCreateMutationRequest,
   config: Partial<RequestConfig<TagControllerCreateMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      TagControllerCreateMutationResponse,
      ResponseErrorConfig<TagControllerCreate409>,
      TagControllerCreateMutationRequest
   >({
      method: 'POST',
      url: getTagControllerCreateUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
