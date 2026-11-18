import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '@/redis/redis.module';

import { EDIT_LOCK_TTL_SECONDS } from './edit-lock.constants';
import type { EditLockEntity } from './enum/edit-lock-entity.enum';

type EditLockHolder = { userId: number; name: string; since: string; sessionId: string };

export type EditLockState = { holder: EditLockHolder | null; mine: boolean };

const ACQUIRE_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current then
   local ok, holder = pcall(cjson.decode, current)
   if ok and type(holder) == 'table' and holder.sessionId then
      if holder.sessionId == ARGV[1] and holder.userId == tonumber(ARGV[5]) then
         redis.call('EXPIRE', KEYS[1], ARGV[3])
         return {1, current}
      end
      if ARGV[2] ~= '1' then
         return {0, current}
      end
   end
end
redis.call('SET', KEYS[1], ARGV[4], 'EX', ARGV[3])
return {1, ARGV[4]}
`;

const RELEASE_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
local ok, holder = pcall(cjson.decode, current)
if ok and type(holder) == 'table' and holder.sessionId == ARGV[1] and holder.userId == tonumber(ARGV[2]) then
   return redis.call('DEL', KEYS[1])
end
return 0
`;

type LockCommands = {
   editLockAcquire(key: string, ...args: (string | number)[]): Promise<[number, string]>;
   editLockRelease(key: string, ...args: (string | number)[]): Promise<number>;
};

const parseHolder = (raw: string | null): EditLockHolder | null => {
   if (!raw) return null;
   try {
      const value = JSON.parse(raw) as Partial<EditLockHolder>;
      return typeof value.userId === 'number' &&
         typeof value.name === 'string' &&
         typeof value.since === 'string' &&
         typeof value.sessionId === 'string'
         ? (value as EditLockHolder)
         : null;
   } catch {
      return null;
   }
};

@Injectable()
export class EditLockService {
   private readonly logger = new Logger(EditLockService.name);

   private readonly commands: LockCommands;

   constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
      redis.defineCommand('editLockAcquire', { numberOfKeys: 1, lua: ACQUIRE_SCRIPT });
      redis.defineCommand('editLockRelease', { numberOfKeys: 1, lua: RELEASE_SCRIPT });
      this.commands = redis as unknown as LockCommands;
   }

   static key(entity: EditLockEntity, id: number): string {
      return `edit-lock:${entity}:${id}`;
   }

   async acquire(
      entity: EditLockEntity,
      id: number,
      user: { id: number; name: string },
      sessionId: string,
      takeOver: boolean,
   ): Promise<EditLockState> {
      const fresh: EditLockHolder = {
         userId: user.id,
         name: user.name,
         since: new Date().toISOString(),
         sessionId,
      };
      const [, value] = await this.run(() =>
         this.commands.editLockAcquire(
            EditLockService.key(entity, id),
            sessionId,
            takeOver ? '1' : '0',
            EDIT_LOCK_TTL_SECONDS,
            JSON.stringify(fresh),
            user.id,
         ),
      );
      const holder = parseHolder(value);
      return { holder, mine: holder?.sessionId === sessionId && holder.userId === user.id };
   }

   async release(
      entity: EditLockEntity,
      id: number,
      userId: number,
      sessionId: string,
   ): Promise<void> {
      await this.run(() =>
         this.commands.editLockRelease(EditLockService.key(entity, id), sessionId, userId),
      );
   }

   async find(
      entity: EditLockEntity,
      id: number,
      viewer?: { userId: number; sessionId: string },
   ): Promise<EditLockState> {
      const holder = parseHolder(
         await this.run(() => this.redis.get(EditLockService.key(entity, id))),
      );
      return {
         holder,
         mine:
            !!holder && holder.sessionId === viewer?.sessionId && holder.userId === viewer.userId,
      };
   }

   async isHeldByOther(
      targets: ReadonlyArray<{ entity: EditLockEntity; id: number }>,
      userId: number,
   ): Promise<boolean> {
      const holders = await Promise.all(targets.map(({ entity, id }) => this.find(entity, id)));
      return holders.some(({ holder }) => holder !== null && holder.userId !== userId);
   }

   private async run<T>(command: () => Promise<T>): Promise<T> {
      try {
         return await command();
      } catch (error) {
         this.logger.warn(`Edit lock store failed: ${(error as Error).message}`);
         throw new ServiceUnavailableException('Edit locks are unavailable');
      }
   }
}
