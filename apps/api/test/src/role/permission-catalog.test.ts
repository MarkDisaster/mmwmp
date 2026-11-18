import { DiscoveryService, Reflector } from '@nestjs/core';

import { AiToolRegistryService } from '../../../src/ai/tools/ai-tool-registry.service';
import {
   PERMISSION_KEY,
   type RequiredPermission,
} from '../../../src/common/decorators/require-permission.decorator';
import { PERMISSION_CATALOG } from '../../../src/role/permission-catalog';
import { getApp } from '../../setup/init';

const label = ({ resource, action }: RequiredPermission) => `${resource}.${action}`;

const isInCatalog = ({ resource, action }: RequiredPermission) =>
   PERMISSION_CATALOG[resource].includes(action);

describe('Permission catalog against the application (e2e)', () => {
   it('should contain the permission of every REST route', () => {
      const discovery = getApp().get(DiscoveryService);
      const reflector = getApp().get(Reflector);
      const required: RequiredPermission[] = [];

      for (const { instance } of discovery.getControllers()) {
         if (!instance) continue;
         const prototype = Object.getPrototypeOf(instance) as Record<string, unknown>;
         for (const name of Object.getOwnPropertyNames(prototype)) {
            const handler = prototype[name];
            if (typeof handler !== 'function') continue;
            const permission = reflector.get<RequiredPermission | undefined>(
               PERMISSION_KEY,
               handler,
            );
            if (permission) required.push(permission);
         }
      }

      expect(required.length).toBeGreaterThan(50);
      expect(required.filter((permission) => !isInCatalog(permission)).map(label)).toEqual([]);
   });

   it('should contain the permission of every AI tool', () => {
      const tools = getApp().get(AiToolRegistryService).getRegistrySnapshot();
      const required = tools.flatMap(({ meta }) =>
         typeof meta.permission === 'string' ? [] : [meta.permission],
      );

      expect(required.length).toBeGreaterThan(50);
      expect(required.filter((permission) => !isInCatalog(permission)).map(label)).toEqual([]);
   });
});
