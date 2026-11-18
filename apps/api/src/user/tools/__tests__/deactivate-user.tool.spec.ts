import { ConflictException, ForbiddenException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool } from '@/ai/tools/ai-tool.decorator';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { UserService } from '../../user.service';
import { DeactivateUserTool } from '../deactivate-user.tool';
import { ReactivateUserTool } from '../reactivate-user.tool';

describe('DeactivateUserTool and ReactivateUserTool', () => {
   const user = { id: 3, email: 'a@b.cz', deactivatedAt: '2026-11-09T10:00:00.000Z' };
   let service: { deactivate: jest.Mock; reactivate: jest.Mock };
   let deactivate: DeactivateUserTool;
   let reactivate: ReactivateUserTool;

   beforeEach(() => {
      service = {
         deactivate: jest.fn().mockResolvedValue(user),
         reactivate: jest.fn().mockResolvedValue({ ...user, deactivatedAt: null }),
      };
      deactivate = new DeactivateUserTool(service as unknown as UserService);
      reactivate = new ReactivateUserTool(service as unknown as UserService);
   });

   it.each([
      [DeactivateUserTool, 'deactivateUser', 'user.deactivate'],
      [ReactivateUserTool, 'reactivateUser', 'user.reactivate'],
   ])('%p declares users.update, an approval tile and its audit action', (Class, name, action) => {
      expect(Reflect.getMetadata(AiTool.KEY, Class)).toMatchObject({
         name,
         permission: { resource: PermissionResource.users, action: PermissionAction.update },
         behavior: 'mutating',
         needsApproval: true,
         audit: { action, resourceType: 'user' },
      });
   });

   it('delegates to the service with the caller as the actor', async () => {
      await expect(deactivate.execute(adminContext(), { id: 3 })).resolves.toEqual(user);
      await expect(reactivate.execute(adminContext(), { id: 3 })).resolves.toEqual({
         ...user,
         deactivatedAt: null,
      });

      expect(service.deactivate).toHaveBeenCalledWith(3, 1);
      expect(service.reactivate).toHaveBeenCalledWith(3, 1);
   });

   it('relays the refusals of the service with their message', async () => {
      service.deactivate.mockRejectedValue(
         new ForbiddenException('Cannot modify your own account'),
      );
      service.reactivate.mockRejectedValue(new ConflictException('User is not deactivated'));

      await expect(deactivate.execute(adminContext(), { id: 1 })).rejects.toThrow(/own account/);
      await expect(reactivate.execute(adminContext(), { id: 1 })).rejects.toThrow(
         /not deactivated/,
      );
   });
});
