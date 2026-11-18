import type { AddressInfo, Server } from 'node:net';

import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { ClientIpThrottlerGuard } from '@/common/guards/client-ip-throttler.guard';
import { ProjectService } from '@/project/project.service';
import { ProjectPublicController } from '@/project/project-public.controller';

import { GLOBAL_THROTTLE } from '../throttle-limits';

const ADDRESS = '198.51.100.20';

describe('Throttle limits', () => {
   let app: INestApplication<App>;
   let baseUrl: string;

   const login = () =>
      request(baseUrl)
         .post('/auth/login')
         .set('X-Real-IP', ADDRESS)
         .send({ email: 'user@example.com', password: 'password123' });
   const readProjects = () => request(baseUrl).get('/public/projects').set('X-Real-IP', ADDRESS);

   const statusesOf = async (send: () => request.Test, times: number) => {
      const statuses: number[] = [];
      for (let i = 0; i < times; i++) statuses.push((await send()).status);
      return statuses;
   };

   beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
         imports: [ThrottlerModule.forRoot({ throttlers: [GLOBAL_THROTTLE] })],
         controllers: [AuthController, ProjectPublicController],
         providers: [
            { provide: APP_GUARD, useClass: ClientIpThrottlerGuard },
            { provide: AuthService, useValue: { signIn: jest.fn().mockResolvedValue({}) } },
            {
               provide: ProjectService,
               useValue: { findAllPublished: jest.fn().mockResolvedValue({ data: [] }) },
            },
         ],
      }).compile();
      app = moduleRef.createNestApplication();
      await app.listen(0, '127.0.0.1');
      const { port } = (app.getHttpServer() as Server).address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${port}`;
   });

   afterEach(() => app.close());

   it('serves only on the loopback address, which no other process can share a port on', () => {
      const address = (app.getHttpServer() as Server).address() as AddressInfo;

      expect(address).toMatchObject({ address: '127.0.0.1', family: 'IPv4' });
   });

   it('refuses the 61st login of one address within a minute', async () => {
      const statuses = await statusesOf(login, 60);

      const refused = await login();

      expect(statuses).toEqual(Array.from({ length: 60 }, () => 201));
      expect(refused.status).toBe(429);
   });

   it('serves 200 public reads of one address within a minute', async () => {
      const statuses = await statusesOf(readProjects, 200);

      expect(statuses).toEqual(Array.from({ length: 200 }, () => 200));
   });

   it('keeps serving public reads to an address whose logins are refused', async () => {
      await statusesOf(login, 61);

      const read = await readProjects();

      expect(read.status).toBe(200);
      expect(read.headers['x-ratelimit-limit']).toBe('300');
   });
});
