/* eslint-disable */

import type { ServiceEntity } from './ServiceEntity';

export type ServiceControllerFindOnePathParams = {
   id: number;
};

export type ServiceControllerFindOne200 = ServiceEntity;

export type ServiceControllerFindOne404 = any;

export type ServiceControllerFindOneQueryResponse = ServiceControllerFindOne200;

export type ServiceControllerFindOneQuery = {
   Response: ServiceControllerFindOne200;
   PathParams: ServiceControllerFindOnePathParams;
   Errors: ServiceControllerFindOne404;
};
