import pg from 'pg';

import type { PrismaService } from '../../src/prisma/prisma.service';

export const waitForBlockedAdvisoryLock = async (prisma: PrismaService, timeoutMs = 5_000) => {
   const deadline = Date.now() + timeoutMs;
   while (Date.now() < deadline) {
      const [{ waiting }] = await prisma.$queryRaw<{ waiting: number }[]>`
         SELECT count(*)::int AS waiting FROM pg_locks WHERE locktype = 'advisory' AND NOT granted`;
      if (waiting > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
   }
   throw new Error('No statement is waiting for an advisory lock');
};

export const holdLock = async (sql: string, params: unknown[]) => {
   const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
   await client.connect();
   await client.query('BEGIN');
   await client.query(sql, params);
   return {
      release: async () => {
         await client.query('COMMIT');
         await client.end();
      },
   };
};

export const holdRowLock = (table: 'projects' | 'services' | 'roles', id: number) =>
   holdLock(`SELECT id FROM ${table} WHERE id = $1 FOR NO KEY UPDATE`, [id]);

export const countLockWaits = async (prisma: PrismaService) => {
   const [{ waiting }] = await prisma.$queryRaw<{ waiting: number }[]>`
      SELECT count(*)::int AS waiting FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock'`;
   return waiting;
};

export const waitForLockWait = async (prisma: PrismaService, timeoutMs = 4_000, count = 1) => {
   const deadline = Date.now() + timeoutMs;
   while (Date.now() < deadline) {
      if ((await countLockWaits(prisma)) >= count) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
   }
   throw new Error(`Fewer than ${count} statements are waiting for a lock`);
};

export const startRequest = <T>(request: PromiseLike<T>) => {
   let settled = false;
   const promise = Promise.resolve(request).finally(() => {
      settled = true;
   });
   return { promise, isSettled: () => settled };
};
