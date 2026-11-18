import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { ReplaySubject, Subject } from 'rxjs';

import type { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { REDIS_CLIENT } from '@/redis/redis.module';

import { ADMIN_EVENTS_CHANNEL } from './admin-events.constants';
import type { AdminEventEntity } from './entity/admin-event.entity';
import type { AdminEventAction } from './enum/admin-event-action.enum';

export type AdminEvent = AdminEventEntity;

@Injectable()
export class AdminEventsService implements OnModuleInit, OnModuleDestroy {
   private readonly logger = new Logger(AdminEventsService.name);
   private subscriber: Redis | null = null;

   private readonly eventSubject = new Subject<AdminEvent>();
   private readonly resyncSubject = new Subject<void>();
   private readonly shutdownSubject = new ReplaySubject<void>(1);
   private closing = false;

   readonly events$ = this.eventSubject.asObservable();

   readonly resync$ = this.resyncSubject.asObservable();

   readonly shutdown$ = this.shutdownSubject.asObservable();

   readonly channel: string;

   constructor(
      @Inject(REDIS_CLIENT) private readonly redis: Redis,
      config: ConfigService,
   ) {
      this.channel = `${config.get<string>('redis.keyPrefix') ?? ''}${ADMIN_EVENTS_CHANNEL}`;
   }

   get isClosing(): boolean {
      return this.closing;
   }

   onModuleInit(): void {
      const subscriber = this.redis.duplicate({ maxRetriesPerRequest: null });
      this.subscriber = subscriber;

      subscriber.on('message', (channel: string, message: string) => {
         if (channel === this.channel) this.receive(message);
      });
      subscriber.on('error', (error: Error) =>
         this.logger.warn(`Admin events subscription: ${error.message}`),
      );
      let wasReady = false;
      subscriber.on('ready', () => {
         if (wasReady) this.resyncSubject.next();
         wasReady = true;
      });
      void subscriber.subscribe(this.channel).catch((error: Error) => {
         this.logger.warn(`Admin events subscribe failed: ${error.message}`);
      });
   }

   async onModuleDestroy(): Promise<void> {
      this.closing = true;
      this.shutdownSubject.next();
      this.shutdownSubject.complete();
      const subscriber = this.subscriber;
      this.subscriber = null;
      try {
         await subscriber?.quit();
      } catch (error) {
         this.logger.warn(`Admin events quit failed: ${(error as Error).message}`);
      }
   }

   publish(
      entity: EditLockEntity,
      id: number,
      action: AdminEventAction,
      version: number | null,
   ): void {
      const event: AdminEvent = { entity, id, action, version };
      this.redis.publish(this.channel, JSON.stringify(event)).catch((error: Error) => {
         this.logger.warn(`Admin event not published: ${error.message}`);
         this.eventSubject.next(event);
      });
   }

   private receive(message: string): void {
      try {
         this.eventSubject.next(JSON.parse(message) as AdminEvent);
      } catch {
         this.logger.warn('Admin events: a message that is not JSON was dropped');
      }
   }
}
