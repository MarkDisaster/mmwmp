/* eslint-disable */

export type ChatControllerGetMessagesPathParams = {
   id: string;
};

export const chatControllerGetMessages200RoleEnum = {
   user: 'user',
   assistant: 'assistant',
   system: 'system',
} as const;

export type ChatControllerGetMessages200RoleEnumKey =
   (typeof chatControllerGetMessages200RoleEnum)[keyof typeof chatControllerGetMessages200RoleEnum];

export type ChatControllerGetMessages200 = ChatControllerGetMessages200RoleEnumKey[];

export type ChatControllerGetMessagesQueryResponse = ChatControllerGetMessages200;

export type ChatControllerGetMessagesQuery = {
   Response: ChatControllerGetMessages200;
   PathParams: ChatControllerGetMessagesPathParams;
   Errors: any;
};
