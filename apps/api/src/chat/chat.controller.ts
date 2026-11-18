import {
   Body,
   Controller,
   DefaultValuePipe,
   Get,
   HttpStatus,
   Param,
   ParseIntPipe,
   Post,
   Query,
   Req,
   Res,
   UseGuards,
} from '@nestjs/common';
import {
   ApiBearerAuth,
   ApiBody,
   ApiOperation,
   ApiParam,
   ApiQuery,
   ApiResponse,
   ApiTags,
} from '@nestjs/swagger';
import { APICallError, generateId, pipeUIMessageStreamToResponse, RetryError } from 'ai';
import type { Request, Response } from 'express';

import { toToolActor } from '@/ai/tools/tool-auth';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/guards/auth.guard';
import { AuthGuard } from '@/common/guards/auth.guard';
import { clientIp } from '@/common/request/client-ip';

import { ChatService } from './chat.service';
import { ChatRateLimitService } from './chat-rate-limit.service';
import { resolveChatTurn } from './chat-turn';
import { ConversationService } from './conversation.service';
import { StreamChatBodyDto } from './dto/stream-chat.dto';
import { ConversationEntity } from './entity/conversation.entity';
import { PageContextService } from './page-context.service';

const CONVERSATION_LIST_DEFAULT_LIMIT = 50;
const CONVERSATION_LIST_MAX_LIMIT = 100;

const STREAM_QUOTA_MESSAGE =
   'Limit dosažen — denní kvóta AI provideru je vyčerpaná. Zkuste to později.';
const STREAM_ERROR_MESSAGE = 'Aurora narazila na chybu při generování odpovědi. Zkuste to znovu.';

export const toStreamErrorMessage = (error: unknown): string => {
   const cause = RetryError.isInstance(error) ? error.lastError : error;
   return APICallError.isInstance(cause) && cause.statusCode === HttpStatus.TOO_MANY_REQUESTS
      ? STREAM_QUOTA_MESSAGE
      : STREAM_ERROR_MESSAGE;
};

@ApiTags('Chat')
@Controller('chat')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
   constructor(
      private readonly chat: ChatService,
      private readonly conversations: ConversationService,
      private readonly chatRateLimit: ChatRateLimitService,
      private readonly pageContext: PageContextService,
   ) {}

   @Post('conversations')
   @ApiOperation({ summary: 'Create a new (empty) conversation' })
   @ApiResponse({ status: 201, type: ConversationEntity })
   createConversation(@CurrentUser() user: AuthenticatedUser) {
      return this.conversations.create(user.id);
   }

   @Get('conversations')
   @ApiOperation({ summary: 'List the current user conversations (most recent first)' })
   @ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Max conversations to return (default 50, max 100)',
   })
   @ApiResponse({ status: 200, type: [ConversationEntity] })
   listConversations(
      @CurrentUser() user: AuthenticatedUser,
      @Query('limit', new DefaultValuePipe(CONVERSATION_LIST_DEFAULT_LIMIT), ParseIntPipe)
      limit: number,
   ) {
      const safe = Math.min(Math.max(limit, 1), CONVERSATION_LIST_MAX_LIMIT);
      return this.conversations.listByUser(user.id, safe);
   }

   @Get('conversations/:id/messages')
   @ApiOperation({
      summary: 'Load the message history of a conversation owned by the current user',
   })
   @ApiParam({ name: 'id', type: String })
   @ApiResponse({
      status: 200,
      description:
         'Array of Vercel AI SDK `UIMessage` objects. Each item has `id`, `role` ' +
         '(`user` | `assistant` | `system`), and `parts` — a discriminated union ' +
         'of text/reasoning/tool/file parts. The shape is owned by `ai@^6` and ' +
         'consumed verbatim by `@ai-sdk/react` `useChat()` on the client.',
      schema: {
         type: 'array',
         items: {
            type: 'object',
            required: ['id', 'role', 'parts'],
            properties: {
               id: { type: 'string' },
               role: { type: 'string', enum: ['user', 'assistant', 'system'] },
               parts: { type: 'array', items: { type: 'object' } },
            },
         },
      },
   })
   getMessages(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
      return this.conversations.getMessagesForUser(id, user.id);
   }

   @Post('conversations/:id/stream')
   @ApiOperation({ summary: 'Send a user turn and stream the agent response' })
   @ApiParam({ name: 'id', type: String })
   @ApiBody({ type: StreamChatBodyDto })
   @ApiResponse({ status: 200, description: 'Vercel AI SDK UIMessage data stream' })
   @ApiResponse({ status: 429, description: 'Chat rate limit of the user exceeded' })
   async stream(
      @CurrentUser() user: AuthenticatedUser,
      @Param('id') id: string,
      @Body() body: StreamChatBodyDto,
      @Req() req: Request,
      @Res() res: Response,
   ): Promise<void> {
      const disconnect = new AbortController();
      res.once('close', () => {
         if (!res.writableFinished) disconnect.abort();
      });

      await this.conversations.findByIdForUser(id, user.id);
      this.chat.assertAvailable();
      await this.chatRateLimit.assertWithinLimit(user.id);

      const stored = await this.conversations.findHistory(id);
      const turn = await resolveChatTurn(stored, body.messages.at(-1));
      if (turn.kind === 'message') {
         for (const update of turn.closed) {
            await this.conversations.replaceMessage(id, update);
         }
         await this.conversations.addMessage(id, turn.message);
      } else {
         await this.conversations.replaceMessage(id, turn);
      }
      const messages = turn.history;

      const actor = toToolActor(user);
      const page = await this.pageContext.resolve(actor, body.pageContext?.path);
      const result = await this.chat.streamAgent(
         messages,
         {
            conversationId: id,
            user: actor,
            ipAddress: clientIp(req),
            userAgent: req.headers['user-agent'] ?? null,
         },
         page,
         disconnect.signal,
      );
      void result.consumeStream();

      pipeUIMessageStreamToResponse({
         response: res,
         stream: result.toUIMessageStream({
            originalMessages: messages,
            generateMessageId: generateId,
            onFinish: async ({ responseMessage, isContinuation }) => {
               await this.conversations.saveResponse(id, responseMessage, isContinuation);
            },
            onError: toStreamErrorMessage,
         }),
      });
   }
}
