/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type { ContactControllerFindQueryResponse } from '../models/ContactControllerFind';

function getContactControllerFindUrl() {
   const res = { method: 'GET', url: `/contact` as const };
   return res;
}

export async function contactControllerFind(
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ContactControllerFindQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({ method: 'GET', url: getContactControllerFindUrl().url.toString(), ...requestConfig });
   return res;
}
