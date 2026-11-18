/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   TagControllerUpdateMutationRequest,
   TagControllerUpdateMutationResponse,
   TagControllerUpdatePathParams,
   TagControllerUpdate404,
   TagControllerUpdate409,
} from '../models/TagControllerUpdate';

function getTagControllerUpdateUrl(id: TagControllerUpdatePathParams['id']) {
   const res = { method: 'PATCH', url: `/tags/${id}` as const };
   return res;
}

export async function tagControllerUpdate(
   id: TagControllerUpdatePathParams['id'],
   data: TagControllerUpdateMutationRequest,
   config: Partial<RequestConfig<TagControllerUpdateMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      TagControllerUpdateMutationResponse,
      ResponseErrorConfig<TagControllerUpdate404 | TagControllerUpdate409>,
      TagControllerUpdateMutationRequest
   >({
      method: 'PATCH',
      url: getTagControllerUpdateUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
