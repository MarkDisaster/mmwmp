import { NotFoundException } from '@nestjs/common';

import {
   adminContext,
   contextWithGrants,
   mockToolAudit,
   mockToolPrisma,
   noPermissionContext,
   toolOptions,
} from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { AiToolRegistryService } from '@/ai/tools/ai-tool-registry.service';
import type { ToolAuditService } from '@/ai/tools/tool-audit.service';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import type { PrismaService } from '@/prisma/prisma.service';

import type { UserService } from '../../user.service';
import { DeleteUserTool } from '../delete-user.tool';

describe('DeleteUserTool', () => {
   let service: { softDelete: jest.Mock };
   let toolInstance: DeleteUserTool;

   const run = (input: { id: number }) => toolInstance.execute(adminContext(), input);

   beforeEach(() => {
      service = { softDelete: jest.fn().mockResolvedValue(undefined) };
      toolInstance = new DeleteUserTool(service as unknown as UserService);
   });

   it('declares users.delete, destructive behavior and the user.delete audit action', () => {
      expect(Reflect.getMetadata(AiTool.KEY, DeleteUserTool)).toMatchObject({
         name: 'deleteUser',
         permission: { resource: PermissionResource.users, action: PermissionAction.delete },
         behavior: 'destructive',
         audit: { action: 'user.delete', resourceType: 'user' },
      });
   });

   it('delegates to UserService.softDelete and returns the deletion ack', async () => {
      await expect(run({ id: 3 })).resolves.toEqual({ id: 3, deleted: true });

      expect(service.softDelete).toHaveBeenCalledWith(3, 1);
   });

   it('relays the refusal of the service with its message', async () => {
      service.softDelete.mockRejectedValue(new NotFoundException('User with id 9 not found'));

      await expect(run({ id: 9 })).rejects.toThrow(/User with id 9 not found/);
   });

   describe('through the registry wrapper', () => {
      let toolAudit: ReturnType<typeof mockToolAudit>;
      let execute: (input: unknown, options: unknown) => Promise<unknown>;

      const granted = () =>
         contextWithGrants([
            { resource: PermissionResource.users, action: PermissionAction.delete },
         ]);

      beforeEach(() => {
         toolAudit = mockToolAudit();
         const meta = Reflect.getMetadata(AiTool.KEY, DeleteUserTool) as AiToolMetadata;
         const sdkTool = AiToolRegistryService.buildSdkTool(
            {
               meta,
               behavior: 'destructive',
               handler: toolInstance,
               source: 'UserModule/DeleteUserTool',
            },
            toolAudit as unknown as ToolAuditService,
            mockToolPrisma() as unknown as PrismaService,
         );
         execute = sdkTool.execute as typeof execute;
      });

      it('refuses a caller without users.delete and never reaches the service', async () => {
         await expect(execute({ id: 3 }, toolOptions(noPermissionContext()))).rejects.toThrow(
            'Insufficient permissions: users.delete',
         );

         expect(service.softDelete).not.toHaveBeenCalled();
         expect(toolAudit.logToolSuccess).not.toHaveBeenCalled();
      });

      it('deletes and writes an AI audit row for a caller with users.delete', async () => {
         const ctx = granted();

         await expect(execute({ id: 3 }, toolOptions(ctx))).resolves.toEqual({
            id: 3,
            deleted: true,
         });

         expect(service.softDelete).toHaveBeenCalledWith(3, 2);
         expect(toolAudit.logToolSuccess).toHaveBeenCalledWith(
            { ...ctx, ipAddress: null, userAgent: null },
            {
               action: 'user.delete',
               resourceType: 'user',
               resourceId: 3,
            },
         );
      });

      it('writes a failure row instead of a success row when the service rejects', async () => {
         service.softDelete.mockRejectedValue(new NotFoundException('User with id 9 not found'));

         await expect(execute({ id: 9 }, toolOptions(granted()))).rejects.toThrow(
            /User with id 9 not found/,
         );

         expect(toolAudit.logToolSuccess).not.toHaveBeenCalled();
         expect(toolAudit.logToolFailure).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ toolName: 'deleteUser', input: { id: 9 } }),
         );
      });
   });
});
