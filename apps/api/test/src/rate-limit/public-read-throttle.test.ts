import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { THROTTLER_LIMIT, THROTTLER_SKIP } from '@nestjs/throttler/dist/throttler.constants';

import { getApp, getHttpServer } from '../../setup/init';

type Route = { route: string; limit: unknown; skip: unknown };

const findRoutes = (): Route[] => {
   const app = getApp();
   const reflector = app.get(Reflector);
   const scanner = app.get(MetadataScanner);

   return app
      .get(DiscoveryService)
      .getControllers()
      .flatMap(({ metatype, instance }) => {
         if (!metatype || !instance) return [];
         const prototype = Object.getPrototypeOf(instance) as Record<string, () => unknown>;
         const controllerPath = String(Reflect.getMetadata(PATH_METADATA, metatype));

         return scanner.getAllMethodNames(prototype).flatMap((name) => {
            const handler = prototype[name];
            const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod;
            if (method === undefined) return [];
            const handlerPath = String(Reflect.getMetadata(PATH_METADATA, handler));
            const targets = [handler, metatype];
            return {
               route: `${RequestMethod[method]} ${controllerPath}/${handlerPath}`,
               limit: reflector.getAllAndOverride(`${THROTTLER_LIMIT}default`, targets),
               skip: reflector.getAllAndOverride(`${THROTTLER_SKIP}default`, targets),
            };
         });
      });
};

const readProjects = (realIp: string) =>
   getHttpServer().get('/public/projects').set('X-Real-IP', realIp);

const readProjectsTimes = async (realIp: string, times: number) => {
   const statuses: number[] = [];
   for (let i = 0; i < times; i++) statuses.push((await readProjects(realIp)).status);
   return statuses;
};

describe('Public read throttle (e2e)', () => {
   it('raises the limit of the public content reads only, and of their GET routes only', () => {
      const routes = findRoutes();
      const isPublicContentRead = ({ route }: Route) =>
         route.startsWith('GET public/') && !route.startsWith('GET public/runner-scores');

      expect(routes.filter(isPublicContentRead).length).toBeGreaterThan(0);
      expect(routes.filter((route) => route.limit !== undefined)).toEqual(
         routes.filter(isPublicContentRead),
      );
      expect(routes.filter(isPublicContentRead).map(({ limit }) => limit)).toEqual(
         routes.filter(isPublicContentRead).map(() => 300),
      );
      expect(routes.filter(({ skip }) => skip !== undefined)).toEqual([]);
   });

   it('answers 200 public reads from one address within a minute', async () => {
      const statuses = await readProjectsTimes('198.51.100.10', 200);

      expect(statuses).toEqual(Array.from({ length: 200 }, () => 200));
   });

   it('refuses the 301st public read of one address within a minute and serves another', async () => {
      await readProjectsTimes('198.51.100.11', 300);

      const refused = await readProjects('198.51.100.11');
      const other = await readProjects('198.51.100.12');

      expect(refused.status).toBe(429);
      expect(other.status).toBe(200);
      expect(other.headers['x-ratelimit-limit']).toBe('300');
   });
});
