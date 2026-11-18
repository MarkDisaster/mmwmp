/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   HealthControllerCheckQueryResponse,
   HealthControllerCheck503,
} from '../models/HealthControllerCheck';

function getHealthControllerCheckUrl() {
   const res = { method: 'GET', url: `/health` as const };
   return res;
}

export async function healthControllerCheck(
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      HealthControllerCheckQueryResponse,
      ResponseErrorConfig<HealthControllerCheck503>,
      unknown
   >({ method: 'GET', url: getHealthControllerCheckUrl().url.toString(), ...requestConfig });
   return res;
}
