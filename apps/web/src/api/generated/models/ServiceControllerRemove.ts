/* eslint-disable */

export type ServiceControllerRemovePathParams = {
   id: number;
};

export type ServiceControllerRemove204 = any;

export type ServiceControllerRemove404 = any;

export type ServiceControllerRemoveMutationResponse = ServiceControllerRemove204;

export type ServiceControllerRemoveMutation = {
   Response: ServiceControllerRemove204;
   PathParams: ServiceControllerRemovePathParams;
   Errors: ServiceControllerRemove404;
};
