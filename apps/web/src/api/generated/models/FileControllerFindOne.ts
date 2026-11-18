/* eslint-disable */

import type { FileEntity } from './FileEntity';

export type FileControllerFindOnePathParams = {
   id: number;
};

export type FileControllerFindOne200 = FileEntity;

export type FileControllerFindOneQueryResponse = FileControllerFindOne200;

export type FileControllerFindOneQuery = {
   Response: FileControllerFindOne200;
   PathParams: FileControllerFindOnePathParams;
   Errors: any;
};
