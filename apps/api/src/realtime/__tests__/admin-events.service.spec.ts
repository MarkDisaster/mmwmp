import { EventEmitter } from 'node:events';

import type { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';

import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';

import { ADMIN_EVENTS_CHANNEL } from '../admin-events.constants';
import { AdminEventsService } from '../admin-events.service';
import { AdminEventAction } from '../enum/admin-event-action.enum';

class FakeSubscriber extends EventEmitter {
   subscribe = jest.fn().mockResolvedValue(1);
   quit = jest.fn().mockResolvedValue('OK');
}

const setup = (keyPrefix?: string) => {
   const subscriber = new FakeSubscriber();
   const redis = {
      duplicate: jest.fn().mockReturnValue(subscriber),
      publish: jest.fn().mockResolvedValue(1),
   };
   const config = { get: jest.fn().mockReturnValue(keyPrefix) } as unknown as ConfigService;
   const service = new AdminEventsService(redis as unknown as Redis, config);
   const received: unknown[] = [];
   service.events$.subscribe((event) => received.push(event));
   return { service, redis, subscriber, received };
};

const projectUpdated = {
   entity: EditLockEntity.projects,
   id: 5,
   action: AdminEventAction.updated,
   version: 3,
};

describe('AdminEventsService', () => {
   describe('the channel', () => {
      it('has the prefix of the deployment, which ioredis does not add to a channel', () => {
         const { service, redis, subscriber } = setup('staging:');
         service.onModuleInit();

         service.publish(EditLockEntity.projects, 5, AdminEventAction.updated, 3);

         expect(service.channel).toBe('staging:admin-events');
         expect(subscriber.subscribe).toHaveBeenCalledWith('staging:admin-events');
         expect(redis.publish).toHaveBeenCalledWith('staging:admin-events', expect.any(String));
      });

      it('is the bare name when no prefix is set', () => {
         expect(setup().service.channel).toBe(ADMIN_EVENTS_CHANNEL);
      });

      it('ignores a message of another channel', () => {
         const { service, subscriber, received } = setup('staging:');
         service.onModuleInit();

         subscriber.emit('message', 'production:admin-events', JSON.stringify(projectUpdated));

         expect(received).toEqual([]);
      });
   });

   it('replays the shutdown to a stream that opens after it began, and says it is closing', async () => {
      const { service } = setup();
      service.onModuleInit();
      expect(service.isClosing).toBe(false);

      await service.onModuleDestroy();

      const late = jest.fn();
      service.shutdown$.subscribe({ next: late });
      expect(late).toHaveBeenCalledTimes(1);
      expect(service.isClosing).toBe(true);
   });

   it('subscribes on a connection of its own that waits for a Redis which is down', () => {
      const { service, redis, subscriber } = setup();

      service.onModuleInit();

      expect(redis.duplicate).toHaveBeenCalledWith({ maxRetriesPerRequest: null });
      expect(subscriber.subscribe).toHaveBeenCalledWith(ADMIN_EVENTS_CHANNEL);
   });

   it('publishes the identity of the change and nothing else', () => {
      const { service, redis } = setup();

      service.publish(EditLockEntity.projects, 5, AdminEventAction.updated, 3);

      expect(redis.publish).toHaveBeenCalledWith(
         ADMIN_EVENTS_CHANNEL,
         JSON.stringify(projectUpdated),
      );
   });

   it('hands a message of the channel to the streams of this instance', () => {
      const { service, subscriber, received } = setup();
      service.onModuleInit();

      subscriber.emit('message', service.channel, JSON.stringify(projectUpdated));

      expect(received).toEqual([projectUpdated]);
   });

   it('does not hand an event to its own streams before the channel delivers it', () => {
      const { service, received } = setup();
      service.onModuleInit();

      service.publish(EditLockEntity.projects, 5, AdminEventAction.updated, 3);

      expect(received).toEqual([]);
   });

   it('drops a message that is not JSON', () => {
      const { service, subscriber, received } = setup();
      service.onModuleInit();

      subscriber.emit('message', service.channel, 'not json');

      expect(received).toEqual([]);
   });

   it('does not throw when Redis refuses the publish, and tells its own streams instead', async () => {
      const { service, redis, received } = setup();
      redis.publish.mockRejectedValue(new Error('down'));

      expect(() =>
         service.publish(EditLockEntity.tags, 2, AdminEventAction.created, 0),
      ).not.toThrow();
      await new Promise(process.nextTick);

      expect(received).toEqual([
         { entity: EditLockEntity.tags, id: 2, action: AdminEventAction.created, version: 0 },
      ]);
   });

   it('asks the streams to read again after the subscription was lost, not at the start', () => {
      const { service, subscriber } = setup();
      const resyncs = jest.fn();
      service.resync$.subscribe(resyncs);
      service.onModuleInit();

      subscriber.emit('ready');
      expect(resyncs).not.toHaveBeenCalled();

      subscriber.emit('ready');
      expect(resyncs).toHaveBeenCalledTimes(1);
   });

   it('ends the streams and closes the subscription on shutdown', async () => {
      const { service, subscriber } = setup();
      const shutdown = jest.fn();
      service.shutdown$.subscribe({ next: shutdown });
      service.onModuleInit();

      await service.onModuleDestroy();

      expect(shutdown).toHaveBeenCalledTimes(1);
      expect(subscriber.quit).toHaveBeenCalled();
   });

   it('survives a subscribe that fails', async () => {
      const { service, subscriber } = setup();
      subscriber.subscribe.mockRejectedValue(new Error('boom'));

      expect(() => service.onModuleInit()).not.toThrow();
      await new Promise(process.nextTick);
   });
});
