import type { AuthenticatedUser } from '@/common/guards/auth.guard';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { toSaveActor } from '../save-actor';

describe('toSaveActor', () => {
   const userWith = (permissions: { resource: string; action: string }[], isAdmin = false) =>
      ({ id: 3, role: { isAdmin, permissions } }) as unknown as AuthenticatedUser;

   it('may publish with the publish permission of the resource', () => {
      const user = userWith([
         { resource: PermissionResource.projects, action: PermissionAction.publish },
      ]);
      expect(toSaveActor(user, PermissionResource.projects)).toEqual({
         userId: 3,
         canPublish: true,
      });
      expect(toSaveActor(user, PermissionResource.services).canPublish).toBe(false);
   });

   it('may publish as an admin', () => {
      expect(toSaveActor(userWith([], true), PermissionResource.services).canPublish).toBe(true);
   });

   it('takes the actor of an AI tool call as well', () => {
      const toolActor = {
         id: 5,
         role: {
            isAdmin: false,
            permissions: [{ resource: 'projects', action: PermissionAction.publish }],
         },
      };
      expect(toSaveActor(toolActor, PermissionResource.projects)).toEqual({
         userId: 5,
         canPublish: true,
      });
   });
});
