import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { DiscoveryService } from '@nestjs/core';

import { WorkerShutdownService } from '../worker-shutdown.service';

class RegisteredProcessor extends WorkerHost {
   readonly close = jest.fn().mockResolvedValue(undefined);

   override get worker() {
      return { close: this.close } as unknown as WorkerHost['worker'];
   }

   process(): Promise<void> {
      return Promise.resolve();
   }
}

class UnregisteredProcessor extends WorkerHost {
   process(): Promise<void> {
      return Promise.resolve();
   }
}

const serviceWith = (...instances: unknown[]) =>
   new WorkerShutdownService({
      getProviders: () => instances.map((instance) => ({ instance })),
   } as unknown as DiscoveryService);

describe('WorkerShutdownService', () => {
   let warn: jest.SpyInstance;

   beforeEach(() => {
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
   });
   afterEach(() => jest.restoreAllMocks());

   it('closes the worker of every processor and leaves other providers alone', async () => {
      const first = new RegisteredProcessor();
      const second = new RegisteredProcessor();

      await serviceWith(first, { close: jest.fn() }, second).beforeApplicationShutdown();

      expect(first.close).toHaveBeenCalledTimes(1);
      expect(second.close).toHaveBeenCalledTimes(1);
   });

   it('closes the other workers and does not throw when one of them fails', async () => {
      const registered = new RegisteredProcessor();

      await expect(
         serviceWith(new UnregisteredProcessor(), registered).beforeApplicationShutdown(),
      ).resolves.toBeUndefined();

      expect(registered.close).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('UnregisteredProcessor'));
   });
});
