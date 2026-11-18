/* eslint-disable */

import type { TagEntity } from './TagEntity';

export type TagControllerRestorePathParams = {
   id: number;
};

export type TagControllerRestore200 = TagEntity;

export type TagControllerRestore404 = any;

export type TagControllerRestore409 = any;

export type TagControllerRestoreMutationResponse = TagControllerRestore200;

export type TagControllerRestoreMutation = {
   Response: TagControllerRestore200;
   PathParams: TagControllerRestorePathParams;
   Errors: TagControllerRestore404 | TagControllerRestore409;
};
