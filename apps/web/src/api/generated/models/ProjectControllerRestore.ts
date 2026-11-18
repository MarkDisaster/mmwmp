/* eslint-disable */

import type { ProjectEntity } from './ProjectEntity';

export type ProjectControllerRestorePathParams = {
   id: number;
};

export type ProjectControllerRestore200 = ProjectEntity;

export type ProjectControllerRestore404 = any;

export type ProjectControllerRestore409 = any;

export type ProjectControllerRestoreMutationResponse = ProjectControllerRestore200;

export type ProjectControllerRestoreMutation = {
   Response: ProjectControllerRestore200;
   PathParams: ProjectControllerRestorePathParams;
   Errors: ProjectControllerRestore404 | ProjectControllerRestore409;
};
