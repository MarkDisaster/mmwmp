/* eslint-disable */

import type { ServiceEntity } from './ServiceEntity';

export type ServiceControllerRestorePathParams = {
   id: number;
};

export type ServiceControllerRestore200 = ServiceEntity;

export type ServiceControllerRestore404 = any;

export type ServiceControllerRestore409 = any;

export type ServiceControllerRestoreMutationResponse = ServiceControllerRestore200;

export type ServiceControllerRestoreMutation = {
   Response: ServiceControllerRestore200;
   PathParams: ServiceControllerRestorePathParams;
   Errors: ServiceControllerRestore404 | ServiceControllerRestore409;
};
