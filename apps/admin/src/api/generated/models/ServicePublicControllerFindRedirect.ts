/* eslint-disable */

import type { SlugRedirectEntity } from './SlugRedirectEntity';

export type ServicePublicControllerFindRedirectPathParams = {
   slug: string;
};

export type ServicePublicControllerFindRedirect200 = SlugRedirectEntity;

export type ServicePublicControllerFindRedirect404 = any;

export type ServicePublicControllerFindRedirectQueryResponse =
   ServicePublicControllerFindRedirect200;

export type ServicePublicControllerFindRedirectQuery = {
   Response: ServicePublicControllerFindRedirect200;
   PathParams: ServicePublicControllerFindRedirectPathParams;
   Errors: ServicePublicControllerFindRedirect404;
};
