/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   AuditControllerFindAllQueryResponse,
   AuditControllerFindAllQueryParams,
} from '../models/AuditControllerFindAll';

function getAuditControllerFindAllUrl() {
   const res = { method: 'GET', url: `/audit/logs` as const };
   return res;
}

export async function auditControllerFindAll(
   params?: AuditControllerFindAllQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      AuditControllerFindAllQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getAuditControllerFindAllUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
