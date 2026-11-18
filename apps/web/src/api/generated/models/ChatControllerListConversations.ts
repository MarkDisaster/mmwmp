/* eslint-disable */

import type { ConversationEntity } from './ConversationEntity';

export type ChatControllerListConversationsQueryParams = {
   limit?: number;
};

export type ChatControllerListConversations200 = ConversationEntity[];

export type ChatControllerListConversationsQueryResponse = ChatControllerListConversations200;

export type ChatControllerListConversationsQuery = {
   Response: ChatControllerListConversations200;
   QueryParams: ChatControllerListConversationsQueryParams;
   Errors: any;
};
