/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServiceControllerAssignProjectsMutationRequest,
   ServiceControllerAssignProjectsMutationResponse,
   ServiceControllerAssignProjectsPathParams,
   ServiceControllerAssignProjects404,
   ServiceControllerAssignProjects409,
} from '../models/ServiceControllerAssignProjects';

function getServiceControllerAssignProjectsUrl(
   id: ServiceControllerAssignProjectsPathParams['id'],
) {
   const res = { method: 'POST', url: `/services/${id}/projects` as const };
   return res;
}

export async function serviceControllerAssignProjects(
   id: ServiceControllerAssignProjectsPathParams['id'],
   data: ServiceControllerAssignProjectsMutationRequest,
   config: Partial<RequestConfig<ServiceControllerAssignProjectsMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ServiceControllerAssignProjectsMutationResponse,
      ResponseErrorConfig<ServiceControllerAssignProjects404 | ServiceControllerAssignProjects409>,
      ServiceControllerAssignProjectsMutationRequest
   >({
      method: 'POST',
      url: getServiceControllerAssignProjectsUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
