import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { Subject } from 'rxjs';

import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';

import { ACCESS_RECHECK_INTERVAL_MS, KEEPALIVE_INTERVAL_MS } from '../admin-events.constants';
import { AdminEventsController } from '../admin-events.controller';
import type { AdminEvent, AdminEventsService } from '../admin-events.service';
import { AdminEventAction } from '../enum/admin-event-action.enum';

type Grant = { resource: string; action: string };

const userWith = (id: number, permissions: Grant[], isAdmin = false) =>
   ({ id, role: { isAdmin, permissions } }) as never;

const READ_PROJECTS: Grant = { resource: 'projects', action: 'read' };
const READ_TAGS: Grant = { resource: 'tags', action: 'read' };

const change = (entity: EditLockEntity, id = 1): AdminEvent => ({
   entity,
   id,
   action: AdminEventAction.updated,
   version: 1,
});

const setup = () => {
   const eventSubject = new Subject<AdminEvent>();
   const resyncSubject = new Subject<void>();
   const shutdownSubject = new Subject<void>();
   const events = {
      events$: eventSubject.asObservable(),
      resync$: resyncSubject.asObservable(),
      shutdown$: shutdownSubject.asObservable(),
   } as unknown as AdminEventsService;
   const authenticate = jest.fn();
   const decode = jest.fn().mockReturnValue(null);
   const controller = new AdminEventsController(
      events,
      { authenticate } as never,
      { decode } as unknown as JwtService,
   );
   const request = { headers: { authorization: 'Bearer token' } } as Request;
   const open = (user: ReturnType<typeof userWith>) => {
      const messages: unknown[] = [];
      const closed = jest.fn();
      const subscription = controller
         .stream(user, request)
         .subscribe({ next: (message) => messages.push(message), complete: closed });
      return { messages, closed, subscription };
   };
   return { eventSubject, resyncSubject, shutdownSubject, authenticate, decode, open };
};

describe('AdminEventsController', () => {
   beforeEach(() => jest.useFakeTimers());
   afterEach(() => jest.useRealTimers());

   it('sends a change to a user who may read its entity, as a named event', () => {
      const { eventSubject, open } = setup();
      const { messages } = open(userWith(1, [READ_PROJECTS]));

      eventSubject.next(change(EditLockEntity.projects, 7));

      expect(messages).toEqual([{ type: 'change', data: change(EditLockEntity.projects, 7) }]);
   });

   it('does not send a change of an entity the user may not read', () => {
      const { eventSubject, open } = setup();
      const { messages } = open(userWith(1, [READ_PROJECTS]));

      eventSubject.next(change(EditLockEntity.tags));
      eventSubject.next(change(EditLockEntity.files));

      expect(messages).toEqual([]);
   });

   it('needs the read grant, an update grant is not enough', () => {
      const { eventSubject, open } = setup();
      const { messages } = open(userWith(1, [{ resource: 'projects', action: 'update' }]));

      eventSubject.next(change(EditLockEntity.projects));

      expect(messages).toEqual([]);
   });

   it('sends every change to an admin role', () => {
      const { eventSubject, open } = setup();
      const { messages } = open(userWith(1, [], true));

      eventSubject.next(change(EditLockEntity.contact));

      expect(messages).toHaveLength(1);
   });

   it('passes a resync to everyone, whatever they may read', () => {
      const { resyncSubject, open } = setup();
      const { messages } = open(userWith(1, []));

      resyncSubject.next();

      expect(messages).toEqual([{ type: 'resync', data: {} }]);
   });

   it('keeps the connection alive with a ping while nothing happens', () => {
      const { open } = setup();
      const { messages } = open(userWith(1, []));

      jest.advanceTimersByTime(KEEPALIVE_INTERVAL_MS * 2);

      expect(messages).toEqual([
         { type: 'ping', data: {} },
         { type: 'ping', data: {} },
      ]);
   });

   it('ends the stream when the server shuts down', () => {
      const { shutdownSubject, open } = setup();
      const { closed } = open(userWith(1, []));

      shutdownSubject.next();

      expect(closed).toHaveBeenCalled();
   });

   it('ends the stream when the access token expires', () => {
      const { decode, open } = setup();
      decode.mockReturnValue({ exp: Date.now() / 1000 + 30 });
      const { closed } = open(userWith(1, []));

      jest.advanceTimersByTime(29_000);
      expect(closed).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1_500);
      expect(closed).toHaveBeenCalled();
   });

   describe('while it stays open', () => {
      it('ends the stream when the token is no longer valid for an active user', async () => {
         const { authenticate, open } = setup();
         authenticate.mockRejectedValue(new UnauthorizedException());
         const { closed } = open(userWith(1, []));

         await jest.advanceTimersByTimeAsync(ACCESS_RECHECK_INTERVAL_MS);

         expect(authenticate).toHaveBeenCalledWith('token');
         expect(closed).toHaveBeenCalled();
      });

      it('keeps the stream when the check itself fails (the database is down)', async () => {
         const { authenticate, open } = setup();
         authenticate.mockRejectedValue(new Error('db down'));
         const { closed } = open(userWith(1, []));

         await jest.advanceTimersByTimeAsync(ACCESS_RECHECK_INTERVAL_MS * 2);

         expect(closed).not.toHaveBeenCalled();
      });

      it('takes over the permissions the user has now', async () => {
         const { authenticate, eventSubject, open } = setup();
         authenticate.mockResolvedValue(userWith(1, [READ_TAGS]));
         const { messages } = open(userWith(1, [READ_PROJECTS]));

         await jest.advanceTimersByTimeAsync(ACCESS_RECHECK_INTERVAL_MS);
         eventSubject.next(change(EditLockEntity.projects));
         eventSubject.next(change(EditLockEntity.tags));

         expect(messages.filter((m) => (m as { type: string }).type !== 'ping')).toEqual([
            { type: 'change', data: change(EditLockEntity.tags) },
         ]);
      });
   });
});
