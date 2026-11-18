/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   FileControllerRemoveMutationResponse,
   FileControllerRemovePathParams,
   FileControllerRemove403,
   FileControllerRemove404,
} from '../models/FileControllerRemove';

function getFileControllerRemoveUrl(id: FileControllerRemovePathParams['id']) {
   const res = { method: 'DELETE', url: `/files/${id}` as const };
   return res;
}

export async function fileControllerRemove(
   id: FileControllerRemovePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      FileControllerRemoveMutationResponse,
      ResponseErrorConfig<FileControllerRemove403 | FileControllerRemove404>,
      unknown
   >({ method: 'DELETE', url: getFileControllerRemoveUrl(id).url.toString(), ...requestConfig });
   return res;
}
