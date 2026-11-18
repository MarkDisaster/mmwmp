/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   TagControllerRestoreMutationResponse,
   TagControllerRestorePathParams,
   TagControllerRestore404,
   TagControllerRestore409,
} from '../models/TagControllerRestore';

function getTagControllerRestoreUrl(id: TagControllerRestorePathParams['id']) {
   const res = { method: 'POST', url: `/tags/${id}/restore` as const };
   return res;
}

export async function tagControllerRestore(
   id: TagControllerRestorePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      TagControllerRestoreMutationResponse,
      ResponseErrorConfig<TagControllerRestore404 | TagControllerRestore409>,
      unknown
   >({ method: 'POST', url: getTagControllerRestoreUrl(id).url.toString(), ...requestConfig });
   return res;
}
