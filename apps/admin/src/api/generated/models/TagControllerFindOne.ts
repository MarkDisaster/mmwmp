/* eslint-disable */

import type { TagEntity } from './TagEntity';

export type TagControllerFindOnePathParams = {
   id: number;
};

export type TagControllerFindOne200 = TagEntity;

export type TagControllerFindOne404 = any;

export type TagControllerFindOneQueryResponse = TagControllerFindOne200;

export type TagControllerFindOneQuery = {
   Response: TagControllerFindOne200;
   PathParams: TagControllerFindOnePathParams;
   Errors: TagControllerFindOne404;
};
