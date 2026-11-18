import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { DEFAULT_DATABASE_POOL_MAX } from '@/config/env/connection-limits';
import { PrismaClient } from '@/generated/prisma/client';

const POOL_IDLE_TIMEOUT_MS = 300_000;
const POOL_CONNECTION_TIMEOUT_MS = 10_000;

export const buildPoolConfig = (env: NodeJS.ProcessEnv = process.env) => ({
   connectionString: env.DATABASE_URL,
   max: Number(env.DATABASE_POOL_MAX || DEFAULT_DATABASE_POOL_MAX),
   idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
   connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
});

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
   constructor() {
      const adapter = new PrismaPg(buildPoolConfig());
      super({ adapter });
   }

   async onModuleInit() {
      await this.$connect();
   }

   async onApplicationShutdown() {
      await this.$disconnect();
   }
}
