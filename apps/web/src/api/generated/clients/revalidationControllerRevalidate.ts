/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   RevalidationControllerRevalidateMutationRequest,
   RevalidationControllerRevalidateMutationResponse,
} from '../models/RevalidationControllerRevalidate';

function getRevalidationControllerRevalidateUrl() {
   const res = { method: 'POST', url: `/revalidation` as const };
   return res;
}

export async function revalidationControllerRevalidate(
   data: RevalidationControllerRevalidateMutationRequest,
   config: Partial<RequestConfig<RevalidationControllerRevalidateMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      RevalidationControllerRevalidateMutationResponse,
      ResponseErrorConfig<Error>,
      RevalidationControllerRevalidateMutationRequest
   >({
      method: 'POST',
      url: getRevalidationControllerRevalidateUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
