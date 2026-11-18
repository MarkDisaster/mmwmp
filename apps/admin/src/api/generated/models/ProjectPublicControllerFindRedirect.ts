/* eslint-disable */

import type { SlugRedirectEntity } from './SlugRedirectEntity';

export type ProjectPublicControllerFindRedirectPathParams = {
   slug: string;
};

export type ProjectPublicControllerFindRedirect200 = SlugRedirectEntity;

export type ProjectPublicControllerFindRedirect404 = any;

export type ProjectPublicControllerFindRedirectQueryResponse =
   ProjectPublicControllerFindRedirect200;

export type ProjectPublicControllerFindRedirectQuery = {
   Response: ProjectPublicControllerFindRedirect200;
   PathParams: ProjectPublicControllerFindRedirectPathParams;
   Errors: ProjectPublicControllerFindRedirect404;
};
