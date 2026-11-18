import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { UIMessage } from 'ai';

import type { Conversation, Message } from '@/generated/prisma/client';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import type { MessageUpdate, StoredMessage } from './chat-turn';

const AGENT_HISTORY_LIMIT = 200;

const toContent = (message: UIMessage) => message as unknown as Prisma.InputJsonValue;

const toRow = (conversationId: string, message: UIMessage) => ({
   id: message.id,
   conversationId,
   role: message.role,
   content: toContent(message),
});

const touch = (tx: Prisma.TransactionClient, conversationId: string) =>
   tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

@Injectable()
export class ConversationService {
   constructor(private readonly prisma: PrismaService) {}

   async create(userId: number, title?: string): Promise<Conversation> {
      return this.prisma.conversation.create({ data: { userId, title } });
   }

   async findByIdForUser(id: string, userId: number): Promise<Conversation> {
      const conversation = await this.prisma.conversation.findFirst({
         where: { id, userId },
      });
      if (!conversation) {
         throw new NotFoundException(`Conversation ${id} not found`);
      }
      return conversation;
   }

   async listByUser(userId: number, limit = 50): Promise<Conversation[]> {
      return this.prisma.conversation.findMany({
         where: { userId },
         orderBy: { updatedAt: 'desc' },
         take: limit,
      });
   }

   async getMessagesForUser(
      conversationId: string,
      userId: number,
      limit = 50,
   ): Promise<UIMessage[]> {
      const conversation = await this.prisma.conversation.findFirst({
         where: { id: conversationId, userId },
         include: {
            messages: { orderBy: { createdAt: 'desc' }, take: limit },
         },
      });
      if (!conversation) {
         throw new NotFoundException(`Conversation ${conversationId} not found`);
      }
      return conversation.messages.reverse().map((m) => m.content as unknown as UIMessage);
   }

   async findHistory(
      conversationId: string,
      limit = AGENT_HISTORY_LIMIT,
   ): Promise<StoredMessage[]> {
      const rows = await this.prisma.message.findMany({
         where: { conversationId },
         orderBy: { createdAt: 'desc' },
         take: limit,
         select: { content: true, updatedAt: true, version: true },
      });
      return rows.reverse().map((row) => ({
         message: row.content as unknown as UIMessage,
         updatedAt: row.updatedAt,
         version: row.version,
      }));
   }

   async addMessage(conversationId: string, message: UIMessage): Promise<void> {
      try {
         await this.prisma.$transaction(async (tx) => {
            await tx.message.create({ data: toRow(conversationId, message) });
            await touch(tx, conversationId);
         });
      } catch (error) {
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException(`Message ${message.id} is already stored`);
         }
         throw error;
      }
   }

   async replaceMessage(
      conversationId: string,
      { message, version }: MessageUpdate,
   ): Promise<void> {
      await this.prisma.$transaction(async (tx) => {
         const { count } = await tx.message.updateMany({
            where: { id: message.id, conversationId, version },
            data: { content: toContent(message), version: { increment: 1 } },
         });
         if (count === 0) {
            throw new ConflictException(`Message ${message.id} changed in the meantime`);
         }
         await touch(tx, conversationId);
      });
   }

   async saveResponse(
      conversationId: string,
      message: UIMessage,
      isContinuation: boolean,
   ): Promise<void> {
      await this.prisma.$transaction(async (tx) => {
         if (isContinuation) {
            await tx.message.updateMany({
               where: { id: message.id, conversationId },
               data: { content: toContent(message), version: { increment: 1 } },
            });
         } else {
            await tx.message.create({ data: toRow(conversationId, message) });
         }
         await touch(tx, conversationId);
      });
   }

   findMessageById(messageId: string): Promise<Message | null> {
      return this.prisma.message.findUnique({ where: { id: messageId } });
   }
}
