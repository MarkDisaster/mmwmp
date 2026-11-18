/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ContactControllerUpsertMutationRequest,
   ContactControllerUpsertMutationResponse,
   ContactControllerUpsert409,
} from '../models/ContactControllerUpsert';

function getContactControllerUpsertUrl() {
   const res = { method: 'PUT', url: `/contact` as const };
   return res;
}

export async function contactControllerUpsert(
   data: ContactControllerUpsertMutationRequest,
   config: Partial<RequestConfig<ContactControllerUpsertMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ContactControllerUpsertMutationResponse,
      ResponseErrorConfig<ContactControllerUpsert409>,
      ContactControllerUpsertMutationRequest
   >({
      method: 'PUT',
      url: getContactControllerUpsertUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
