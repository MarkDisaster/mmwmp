/* eslint-disable */

import type { PublicServiceEntity } from './PublicServiceEntity';

export type ServicePublicControllerFindBySlugPathParams = {
   slug: string;
};

export type ServicePublicControllerFindBySlugHeaderParams = {
   Authorization?: string;
   'Accept-Language'?: string;
};

export type ServicePublicControllerFindBySlug200 = PublicServiceEntity;

export type ServicePublicControllerFindBySlug404 = any;

export type ServicePublicControllerFindBySlugQueryResponse = ServicePublicControllerFindBySlug200;

export type ServicePublicControllerFindBySlugQuery = {
   Response: ServicePublicControllerFindBySlug200;
   PathParams: ServicePublicControllerFindBySlugPathParams;
   HeaderParams: ServicePublicControllerFindBySlugHeaderParams;
   Errors: ServicePublicControllerFindBySlug404;
};
