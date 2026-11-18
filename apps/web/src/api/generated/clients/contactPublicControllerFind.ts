/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type { ContactPublicControllerFindQueryResponse } from '../models/ContactPublicControllerFind';

function getContactPublicControllerFindUrl() {
   const res = { method: 'GET', url: `/public/contact` as const };
   return res;
}

export async function contactPublicControllerFind(
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ContactPublicControllerFindQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({ method: 'GET', url: getContactPublicControllerFindUrl().url.toString(), ...requestConfig });
   return res;
}
