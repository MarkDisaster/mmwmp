/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   FileControllerRestoreMutationResponse,
   FileControllerRestorePathParams,
   FileControllerRestore403,
   FileControllerRestore404,
   FileControllerRestore409,
} from '../models/FileControllerRestore';

function getFileControllerRestoreUrl(id: FileControllerRestorePathParams['id']) {
   const res = { method: 'POST', url: `/files/${id}/restore` as const };
   return res;
}

export async function fileControllerRestore(
   id: FileControllerRestorePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      FileControllerRestoreMutationResponse,
      ResponseErrorConfig<
         FileControllerRestore403 | FileControllerRestore404 | FileControllerRestore409
      >,
      unknown
   >({ method: 'POST', url: getFileControllerRestoreUrl(id).url.toString(), ...requestConfig });
   return res;
}
