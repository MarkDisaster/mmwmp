/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectControllerRestoreMutationResponse,
   ProjectControllerRestorePathParams,
   ProjectControllerRestore404,
   ProjectControllerRestore409,
} from '../models/ProjectControllerRestore';

function getProjectControllerRestoreUrl(id: ProjectControllerRestorePathParams['id']) {
   const res = { method: 'POST', url: `/projects/${id}/restore` as const };
   return res;
}

export async function projectControllerRestore(
   id: ProjectControllerRestorePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectControllerRestoreMutationResponse,
      ResponseErrorConfig<ProjectControllerRestore404 | ProjectControllerRestore409>,
      unknown
   >({ method: 'POST', url: getProjectControllerRestoreUrl(id).url.toString(), ...requestConfig });
   return res;
}
