import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedTestContainer } from 'testcontainers';

export default async (): Promise<void> => {
   const containers = globalThis as Record<string, unknown>;
   const postgres = containers.__POSTGRES_CONTAINER__ as StartedPostgreSqlContainer | undefined;
   const redis = containers.__REDIS_CONTAINER__ as StartedTestContainer | undefined;

   await Promise.all([postgres?.stop(), redis?.stop()]);
};
