import { Prisma } from '@/generated/prisma/client';

export const INTERACTIVE_TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 15_000 };

const LOCK_TIMEOUT = '5s';

export const setLockTimeout = (tx: Prisma.TransactionClient) =>
   tx.$executeRaw(Prisma.sql`SELECT set_config('lock_timeout', ${LOCK_TIMEOUT}, true)`);
