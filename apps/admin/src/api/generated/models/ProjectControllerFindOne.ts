/* eslint-disable */

import type { ProjectEntity } from './ProjectEntity';

export type ProjectControllerFindOnePathParams = {
   id: number;
};

export type ProjectControllerFindOne200 = ProjectEntity;

export type ProjectControllerFindOne404 = any;

export type ProjectControllerFindOneQueryResponse = ProjectControllerFindOne200;

export type ProjectControllerFindOneQuery = {
   Response: ProjectControllerFindOne200;
   PathParams: ProjectControllerFindOnePathParams;
   Errors: ProjectControllerFindOne404;
};
