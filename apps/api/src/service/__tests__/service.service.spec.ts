import { ServiceService } from '../service.service';

const PUBLISHER = { userId: 1, canPublish: true };

describe('ServiceService.move', () => {
   let queryRaw: jest.Mock;
   let delPattern: jest.Mock;
   let service: ServiceService;

   beforeEach(() => {
      queryRaw = jest.fn();
      delPattern = jest.fn();
      const tx = { $executeRaw: jest.fn(), $queryRaw: queryRaw };
      const prisma = { $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) };
      service = new ServiceService(
         prisma as never,
         { delPattern } as never,
         {} as never,
         { revalidate: jest.fn() } as never,
         { publish: jest.fn() } as never,
         { get: jest.fn((_key: string, fallback: unknown) => fallback) } as never,
         {} as never,
      );
   });

   it('refreshes the cache when something moved', async () => {
      queryRaw.mockResolvedValue([
         { id: 1, sortOrder: 0 },
         { id: 2, sortOrder: 1 },
      ]);

      await service.move(1, { targetId: 2, position: 'after' }, PUBLISHER);

      expect(delPattern).toHaveBeenCalledWith('services:*');
   });

   it('keeps the cache when the service already is where it should go', async () => {
      queryRaw.mockResolvedValue([
         { id: 1, sortOrder: 0 },
         { id: 2, sortOrder: 1 },
      ]);

      await service.move(2, { targetId: 1, position: 'after' }, PUBLISHER);

      expect(delPattern).not.toHaveBeenCalled();
   });
});
