import { ConflictException, Logger } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';
import type { PrismaService } from '@/prisma/prisma.service';
import type { StorageService } from '@/storage/storage.service';

import { UserService } from '../user.service';

const failure = (code: string) =>
   new Prisma.PrismaClientKnownRequestError('failed', { code, clientVersion: 'test' });

describe('UserService.deactivate / reactivate', () => {
   let prisma: { $transaction: jest.Mock };
   let service: UserService;

   beforeEach(() => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      prisma = { $transaction: jest.fn() };
      service = new UserService(
         prisma as unknown as PrismaService,
         {} as unknown as StorageService,
      );
   });
   afterEach(() => jest.restoreAllMocks());

   it.each([
      ['deactivate', (s: UserService) => s.deactivate(2, 1)],
      ['reactivate', (s: UserService) => s.reactivate(2, 1)],
   ])('%s answers a transaction that ran out of time with 409', async (_label, run) => {
      prisma.$transaction.mockRejectedValue(failure('P2028'));

      await expect(run(service)).rejects.toBeInstanceOf(ConflictException);
   });

   it.each([
      ['deactivate', (s: UserService) => s.deactivate(2, 1)],
      ['reactivate', (s: UserService) => s.reactivate(2, 1)],
   ])('%s answers a lock wait over its timeout with 409', async (_label, run) => {
      prisma.$transaction.mockRejectedValue(
         Object.assign(new Error('lock timeout'), {
            name: 'DriverAdapterError',
            cause: { originalCode: '55P03' },
         }),
      );

      await expect(run(service)).rejects.toBeInstanceOf(ConflictException);
   });
});
