import { WorkerHost } from '@nestjs/bullmq';
import { BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

@Injectable()
export class WorkerShutdownService implements BeforeApplicationShutdown {
   private readonly logger = new Logger(WorkerShutdownService.name);

   constructor(private readonly discovery: DiscoveryService) {}

   async beforeApplicationShutdown(): Promise<void> {
      const hosts = this.discovery
         .getProviders()
         .map((wrapper) => wrapper.instance as unknown)
         .filter((instance): instance is WorkerHost => instance instanceof WorkerHost);
      const results = await Promise.allSettled(hosts.map(async (host) => host.worker.close()));
      results.forEach((result, index) => {
         if (result.status === 'rejected') {
            const name = hosts[index].constructor.name;
            this.logger.warn(`Closing the worker of ${name} failed: ${String(result.reason)}`);
         }
      });
   }
}
