/* eslint-disable */

export type UserControllerRemovePathParams = {
   id: number;
};

export type UserControllerRemove204 = any;

export type UserControllerRemove403 = any;

export type UserControllerRemove404 = any;

export type UserControllerRemove409 = any;

export type UserControllerRemoveMutationResponse = UserControllerRemove204;

export type UserControllerRemoveMutation = {
   Response: UserControllerRemove204;
   PathParams: UserControllerRemovePathParams;
   Errors: UserControllerRemove403 | UserControllerRemove404 | UserControllerRemove409;
};
