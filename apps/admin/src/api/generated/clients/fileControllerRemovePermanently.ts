/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   FileControllerRemovePermanentlyMutationResponse,
   FileControllerRemovePermanentlyPathParams,
   FileControllerRemovePermanently404,
   FileControllerRemovePermanently409,
} from '../models/FileControllerRemovePermanently';

function getFileControllerRemovePermanentlyUrl(
   id: FileControllerRemovePermanentlyPathParams['id'],
) {
   const res = { method: 'DELETE', url: `/files/${id}/permanent` as const };
   return res;
}

export async function fileControllerRemovePermanently(
   id: FileControllerRemovePermanentlyPathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      FileControllerRemovePermanentlyMutationResponse,
      ResponseErrorConfig<FileControllerRemovePermanently404 | FileControllerRemovePermanently409>,
      unknown
   >({
      method: 'DELETE',
      url: getFileControllerRemovePermanentlyUrl(id).url.toString(),
      ...requestConfig,
   });
   return res;
}
