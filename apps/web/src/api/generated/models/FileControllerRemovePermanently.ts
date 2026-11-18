/* eslint-disable */

export type FileControllerRemovePermanentlyPathParams = {
   id: number;
};

export type FileControllerRemovePermanently204 = any;

export type FileControllerRemovePermanently404 = any;

export type FileControllerRemovePermanently409 = any;

export type FileControllerRemovePermanentlyMutationResponse = FileControllerRemovePermanently204;

export type FileControllerRemovePermanentlyMutation = {
   Response: FileControllerRemovePermanently204;
   PathParams: FileControllerRemovePermanentlyPathParams;
   Errors: FileControllerRemovePermanently404 | FileControllerRemovePermanently409;
};
