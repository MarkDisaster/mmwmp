import { BadRequestException, ConflictException } from '@nestjs/common';
import {
   type DynamicToolUIPart,
   getToolName,
   isToolUIPart,
   safeValidateUIMessages,
   type ToolUIPart,
   type UIMessage,
} from 'ai';

import { CLIENT_TOOLS } from './client-tools';

export const TOOL_APPROVAL_TTL_MS = 30 * 60 * 1000;

const ANSWER_TEXT_MAX_LENGTH = 500;
const EXPIRED_APPROVAL_REASON =
   'The approval request expired before the user answered it. Ask again if the action is still wanted.';
const SUPERSEDED_REASON = 'The user sent a new message instead of answering the approval.';
const INTERRUPTED_ERROR =
   'Interrupted before a result was stored: the action may or may not have run. Check its effect before retrying.';

type ToolPart = ToolUIPart | DynamicToolUIPart;
type UserPart = UIMessage['parts'][number];

export type StoredMessage = { message: UIMessage; updatedAt: Date; version: number };

export type MessageUpdate = { message: UIMessage; version: number };

export type ChatTurn =
   | { kind: 'message'; history: UIMessage[]; message: UIMessage; closed: MessageUpdate[] }
   | ({ kind: 'continuation'; history: UIMessage[] } & MessageUpdate);

const isOpen = (part: ToolPart) =>
   part.state === 'input-streaming' ||
   part.state === 'input-available' ||
   part.state === 'approval-requested' ||
   part.state === 'approval-responded';

const closeToolPart = (part: ToolPart): ToolPart => {
   if (part.state === 'approval-requested') {
      return {
         ...part,
         state: 'output-denied',
         approval: { ...part.approval, approved: false, reason: SUPERSEDED_REASON },
      } as ToolPart;
   }
   if (part.state === 'approval-responded' && !part.approval.approved) {
      return { ...part, state: 'output-denied' } as ToolPart;
   }
   return { ...part, state: 'output-error', errorText: INTERRUPTED_ERROR } as ToolPart;
};

const closeOpenToolParts = (entry: StoredMessage): MessageUpdate | null => {
   const { message } = entry;
   if (!message.parts.some((part) => isToolUIPart(part) && isOpen(part))) return null;
   const parts = message.parts.map((part) =>
      isToolUIPart(part) && isOpen(part) ? closeToolPart(part) : part,
   );
   return { message: { ...message, parts }, version: entry.version };
};

const toUserPart = (part: UserPart): UserPart => {
   if (part.type === 'text') return { type: 'text', text: part.text };
   if (part.type === 'file') {
      return { type: 'file', mediaType: part.mediaType, url: part.url, filename: part.filename };
   }
   throw new BadRequestException('A user message can only contain text and files');
};

const isClientTool = (part: ToolPart) => Object.hasOwn(CLIENT_TOOLS, getToolName(part));

const clip = (text: unknown) =>
   typeof text === 'string' ? text.slice(0, ANSWER_TEXT_MAX_LENGTH) : undefined;

const answerToolPart = (stored: ToolPart, reply: ToolPart, isExpired: boolean): ToolPart | null => {
   if (stored.state === 'approval-requested') {
      if (reply.state !== 'approval-responded' || reply.approval.id !== stored.approval.id) {
         return null;
      }
      const approved = reply.approval.approved === true;
      return {
         ...stored,
         state: 'approval-responded',
         approval: {
            ...stored.approval,
            approved: approved && !isExpired,
            reason: approved && isExpired ? EXPIRED_APPROVAL_REASON : clip(reply.approval.reason),
         },
      } as ToolPart;
   }
   if (stored.state === 'input-available' && isClientTool(stored)) {
      if (reply.state === 'output-available') {
         return { ...stored, state: 'output-available', output: reply.output } as ToolPart;
      }
      if (reply.state === 'output-error') {
         return {
            ...stored,
            state: 'output-error',
            errorText: clip(reply.errorText) ?? 'Tool failed',
         } as ToolPart;
      }
   }
   return null;
};

const userTurn = (stored: StoredMessage[], incoming: UIMessage): ChatTurn => {
   const message: UIMessage = {
      id: incoming.id,
      role: 'user',
      parts: incoming.parts.map(toUserPart),
   };
   if (stored.some((entry) => entry.message.id === incoming.id)) {
      throw new ConflictException(`Message ${incoming.id} is already stored`);
   }
   const closed: MessageUpdate[] = [];
   const history = stored.map((entry) => {
      const update = closeOpenToolParts(entry);
      if (!update) return entry.message;
      closed.push(update);
      return update.message;
   });
   return { kind: 'message', history: [...history, message], message, closed };
};

const continuationTurn = (stored: StoredMessage[], incoming: UIMessage, now: Date): ChatTurn => {
   const last = stored.at(-1);
   if (last?.message.role !== 'assistant' || last.message.id !== incoming.id) {
      throw new ConflictException(
         'Only the last assistant message of the conversation can be answered',
      );
   }
   const replies = new Map(
      incoming.parts.filter(isToolUIPart).map((part) => [part.toolCallId, part]),
   );
   const isExpired = now.getTime() - last.updatedAt.getTime() > TOOL_APPROVAL_TTL_MS;

   let answered = 0;
   const parts = last.message.parts.map((part) => {
      if (!isToolUIPart(part)) return part;
      const reply = replies.get(part.toolCallId);
      const answer = reply ? answerToolPart(part, reply, isExpired) : null;
      if (!answer) return part;
      answered += 1;
      return answer;
   });
   if (answered === 0) {
      throw new ConflictException('The message has no open tool call that this request answers');
   }
   if (
      parts.some(
         (part) => isToolUIPart(part) && isOpen(part) && part.state !== 'approval-responded',
      )
   ) {
      throw new BadRequestException('Every open tool call of the message must be answered');
   }

   const message: UIMessage = { ...last.message, parts };
   const history = [...stored.slice(0, -1).map((entry) => entry.message), message];
   return { kind: 'continuation', history, message, version: last.version };
};

export const resolveChatTurn = async (
   stored: StoredMessage[],
   incoming: unknown,
   now = new Date(),
): Promise<ChatTurn> => {
   const validated = await safeValidateUIMessages({ messages: [incoming] });
   if (!validated.success) {
      throw new BadRequestException('The last message is not a valid UI message');
   }
   const [message] = validated.data;
   if (message.role === 'user') return userTurn(stored, message);
   if (message.role === 'assistant') return continuationTurn(stored, message, now);
   throw new BadRequestException('The client can only send user messages and tool answers');
};
