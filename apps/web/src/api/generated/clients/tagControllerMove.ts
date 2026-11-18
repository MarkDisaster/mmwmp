/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   TagControllerMoveMutationRequest,
   TagControllerMoveMutationResponse,
   TagControllerMovePathParams,
   TagControllerMove400,
   TagControllerMove404,
   TagControllerMove409,
} from '../models/TagControllerMove';

function getTagControllerMoveUrl(id: TagControllerMovePathParams['id']) {
   const res = { method: 'POST', url: `/tags/${id}/move` as const };
   return res;
}

export async function tagControllerMove(
   id: TagControllerMovePathParams['id'],
   data: TagControllerMoveMutationRequest,
   config: Partial<RequestConfig<TagControllerMoveMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      TagControllerMoveMutationResponse,
      ResponseErrorConfig<TagControllerMove400 | TagControllerMove404 | TagControllerMove409>,
      TagControllerMoveMutationRequest
   >({
      method: 'POST',
      url: getTagControllerMoveUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
