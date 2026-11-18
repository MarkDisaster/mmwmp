import { ConflictException } from '@nestjs/common';
import type { UIMessage } from 'ai';

import { Prisma } from '@/generated/prisma/client';
import type { PrismaService } from '@/prisma/prisma.service';

import { ConversationService } from '../conversation.service';

const message: UIMessage = { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Ahoj' }] };

const createService = (count = 1) => {
   const tx = {
      message: {
         create: jest.fn().mockResolvedValue({}),
         updateMany: jest.fn().mockResolvedValue({ count }),
      },
      conversation: { update: jest.fn().mockResolvedValue({}) },
   };
   const outside = () => {
      throw new Error('written outside the transaction');
   };
   const prisma = {
      $transaction: jest.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      message: { create: jest.fn(outside), updateMany: jest.fn(outside) },
      conversation: { update: jest.fn(outside) },
   };
   const service = new ConversationService(prisma as unknown as PrismaService);
   return { service, prisma, tx };
};

const touched = (tx: ReturnType<typeof createService>['tx']) =>
   expect(tx.conversation.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { updatedAt: expect.any(Date) },
   });

describe('ConversationService — message writes', () => {
   it('adds a message and moves the conversation up in one transaction', async () => {
      const { service, prisma, tx } = createService();

      await service.addMessage('c1', message);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.message.create).toHaveBeenCalledWith({
         data: expect.objectContaining({ id: 'm1', conversationId: 'c1', role: 'user' }),
      });
      touched(tx);
   });

   it('reports a message id that is already stored as a conflict', async () => {
      const { service, tx } = createService();
      tx.message.create.mockRejectedValue(
         new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
         }),
      );

      await expect(service.addMessage('c1', message)).rejects.toThrow(ConflictException);
      expect(tx.conversation.update).not.toHaveBeenCalled();
   });

   it('replaces a message and moves the conversation up in one transaction', async () => {
      const { service, prisma, tx } = createService();

      await service.replaceMessage('c1', { message, version: 2 });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.message.updateMany).toHaveBeenCalledWith(
         expect.objectContaining({ where: { id: 'm1', conversationId: 'c1', version: 2 } }),
      );
      touched(tx);
   });

   it('leaves the conversation as it was when the message changed in the meantime', async () => {
      const { service, tx } = createService(0);

      await expect(service.replaceMessage('c1', { message, version: 2 })).rejects.toThrow(
         ConflictException,
      );
      expect(tx.conversation.update).not.toHaveBeenCalled();
   });

   it.each([
      ['a new response', false, 'create'],
      ['a continued response', true, 'updateMany'],
   ] as const)('stores %s in one transaction', async (_, isContinuation, write) => {
      const { service, prisma, tx } = createService();

      await service.saveResponse('c1', { ...message, role: 'assistant' }, isContinuation);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.message[write]).toHaveBeenCalledTimes(1);
      touched(tx);
   });
});
