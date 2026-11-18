/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   AdminEventsControllerStreamQueryResponse,
   AdminEventsControllerStream429,
} from '../models/AdminEventsControllerStream';

function getAdminEventsControllerStreamUrl() {
   const res = { method: 'GET', url: `/admin/events` as const };
   return res;
}

export async function adminEventsControllerStream(
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      AdminEventsControllerStreamQueryResponse,
      ResponseErrorConfig<AdminEventsControllerStream429>,
      unknown
   >({ method: 'GET', url: getAdminEventsControllerStreamUrl().url.toString(), ...requestConfig });
   return res;
}
