import { ServiceUnavailableException } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { EditLockService } from '../edit-lock.service';
import { EditLockEntity } from '../enum/edit-lock-entity.enum';

const holder = (userId: number, sessionId = `tab-${userId}`) =>
   JSON.stringify({ userId, name: `User ${userId}`, since: '2026-11-12T14:02:00.000Z', sessionId });

type Commands = 'get' | 'editLockAcquire' | 'editLockRelease';

const serviceWith = (redis: Partial<Record<Commands, jest.Mock>>) =>
   new EditLockService({ defineCommand: jest.fn(), ...redis } as unknown as Redis);

describe('EditLockService', () => {
   it('builds the key from the entity and the id', () => {
      expect(EditLockService.key(EditLockEntity.projects, 5)).toBe('edit-lock:projects:5');
   });

   it('should register both scripts as commands of the client', () => {
      const defineCommand = jest.fn();
      new EditLockService({ defineCommand } as unknown as Redis);

      expect(
         defineCommand.mock.calls.map(([name, { numberOfKeys }]) => [name, numberOfKeys]),
      ).toEqual([
         ['editLockAcquire', 1],
         ['editLockRelease', 1],
      ]);
   });

   it('should compare the session and the user in both scripts', () => {
      const defineCommand = jest.fn();
      new EditLockService({ defineCommand } as unknown as Redis);

      for (const [, { lua }] of defineCommand.mock.calls) {
         expect(lua).toContain('holder.sessionId == ARGV[1] and holder.userId == tonumber(');
      }
   });

   it('should send the user id to the scripts and report the lock as mine only for both', async () => {
      const acquireCommand = jest.fn().mockResolvedValue([1, holder(1, 'tab-1')]);
      const releaseCommand = jest.fn().mockResolvedValue(1);
      const service = serviceWith({
         editLockAcquire: acquireCommand,
         editLockRelease: releaseCommand,
      });

      await expect(
         service.acquire(EditLockEntity.tags, 1, { id: 1, name: 'A' }, 'tab-1', false),
      ).resolves.toMatchObject({ mine: true });
      await expect(
         service.acquire(EditLockEntity.tags, 1, { id: 2, name: 'B' }, 'tab-1', false),
      ).resolves.toMatchObject({ mine: false });
      expect(acquireCommand.mock.calls[1].at(-1)).toBe(2);

      await service.release(EditLockEntity.tags, 1, 2, 'tab-1');
      expect(releaseCommand).toHaveBeenCalledWith('edit-lock:tags:1', 'tab-1', 2);
   });

   it.each([
      [
         'acquire',
         (service: EditLockService) =>
            service.acquire(EditLockEntity.tags, 1, { id: 1, name: 'A' }, 'tab-1', false),
      ],
      [
         'release',
         (service: EditLockService) => service.release(EditLockEntity.tags, 1, 1, 'tab-1'),
      ],
      ['find', (service: EditLockService) => service.find(EditLockEntity.tags, 1)],
   ])('should answer 503 when Redis fails on %s', async (_name, call) => {
      const failing = jest.fn().mockRejectedValue(new Error('connection lost'));
      const service = serviceWith({
         editLockAcquire: failing,
         editLockRelease: failing,
         get: failing,
      });

      await expect(call(service)).rejects.toBeInstanceOf(ServiceUnavailableException);
   });

   it('should treat a stored value that is not a lock as no lock', async () => {
      const service = serviceWith({ get: jest.fn().mockResolvedValue('{"userId":"x"}') });

      await expect(
         service.find(EditLockEntity.tags, 1, { userId: 1, sessionId: 'tab-1' }),
      ).resolves.toEqual({
         holder: null,
         mine: false,
      });
   });

   describe('isHeldByOther', () => {
      const targets = [
         { entity: EditLockEntity.projects, id: 1 },
         { entity: EditLockEntity.projects, id: 2 },
      ];

      it('should be true when another user holds any of the records', async () => {
         const get = jest.fn((key: string) =>
            Promise.resolve(key.endsWith(':2') ? holder(3) : null),
         );

         await expect(serviceWith({ get }).isHeldByOther(targets, 1)).resolves.toBe(true);
      });

      it('should be false for no lock and for a lock of the caller in any tab', async () => {
         const none = jest.fn().mockResolvedValue(null);
         const own = jest.fn().mockResolvedValue(holder(1, 'other-tab'));

         await expect(serviceWith({ get: none }).isHeldByOther(targets, 1)).resolves.toBe(false);
         await expect(serviceWith({ get: own }).isHeldByOther(targets, 1)).resolves.toBe(false);
      });

      it('should throw when the store fails, so the caller can fail closed', async () => {
         const get = jest.fn().mockRejectedValue(new Error('down'));

         await expect(serviceWith({ get }).isHeldByOther(targets, 1)).rejects.toBeInstanceOf(
            ServiceUnavailableException,
         );
      });
   });
});
