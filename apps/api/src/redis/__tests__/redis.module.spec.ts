import type { AddressInfo, Socket } from 'node:net';
import { createServer } from 'node:net';

import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type IORedis from 'ioredis';

import redisConfig from '@/config/env/redis.config';

import { REDIS_CLIENT, RedisModule } from '../redis.module';

const startSilentServer = async () => {
   const sockets: Socket[] = [];
   const server = createServer((socket) => sockets.push(socket));
   await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
   const stop = () =>
      new Promise<void>((resolve) => {
         sockets.forEach((socket) => socket.destroy());
         server.close(() => resolve());
      });
   return { port: (server.address() as AddressInfo).port, stop };
};

const compileWith = async (url: string, commandTimeoutMs?: string) => {
   process.env.REDIS_URL = url;
   if (commandTimeoutMs) process.env.REDIS_COMMAND_TIMEOUT_MS = commandTimeoutMs;
   else delete process.env.REDIS_COMMAND_TIMEOUT_MS;
   const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, load: [redisConfig] }), RedisModule],
   }).compile();
   return { moduleRef, redis: moduleRef.get<IORedis>(REDIS_CLIENT) };
};

describe('RedisModule — shared client', () => {
   const env = { ...process.env };
   let moduleRef: TestingModule | undefined;
   let redis: IORedis | undefined;
   let warn: jest.SpyInstance;

   beforeEach(() => {
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
   });

   afterEach(async () => {
      redis?.disconnect();
      await moduleRef?.close();
      moduleRef = undefined;
      redis = undefined;
      process.env = { ...env };
      jest.restoreAllMocks();
   });

   it('fails a command that gets no reply after the command timeout', async () => {
      const silent = await startSilentServer();
      try {
         ({ moduleRef, redis } = await compileWith(`redis://127.0.0.1:${silent.port}`, '200'));
         const started = Date.now();

         await expect(redis.get('key')).rejects.toThrow('Command timed out');
         expect(Date.now() - started).toBeLessThan(2_000);
      } finally {
         redis?.disconnect();
         await silent.stop();
      }
   });

   it('logs connection errors as warnings in the structured log', async () => {
      const silent = await startSilentServer();
      await silent.stop();

      ({ moduleRef, redis } = await compileWith(`redis://127.0.0.1:${silent.port}`));
      await new Promise<void>((resolve) => redis?.once('error', () => resolve()));

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('ECONNREFUSED'));
   });
});
