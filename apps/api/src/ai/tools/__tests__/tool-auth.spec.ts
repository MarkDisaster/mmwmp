import type { AuthenticatedUser } from '@/common/guards/auth.guard';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import {
   approvalUnlessDenied,
   assertToolPermission,
   getToolContext,
   ToolPermissionError,
   toToolActor,
} from '../tool-auth';
import {
   adminContext,
   contextWithGrants,
   noPermissionContext,
   toolOptions,
} from './tool-context.fixture';

describe('getToolContext', () => {
   it('returns the actor and conversation from experimental_context', () => {
      const ctx = adminContext();

      expect(getToolContext(toolOptions(ctx))).toEqual({
         ...ctx,
         ipAddress: null,
         userAgent: null,
      });
   });

   it('keeps the request forensics when present', () => {
      const ctx = { ...adminContext(), ipAddress: '10.0.0.1', userAgent: 'jest' };

      expect(getToolContext(toolOptions(ctx))).toEqual(ctx);
   });

   it.each([
      ['undefined options', undefined],
      ['missing context', {}],
      ['null context', { experimental_context: null }],
      ['missing user', { experimental_context: { conversationId: 'c' } }],
      ['user without role', { experimental_context: { user: { id: 1 }, conversationId: 'c' } }],
      [
         'role without permissions array',
         {
            experimental_context: {
               user: { id: 1, role: { isAdmin: false } },
               conversationId: 'c',
            },
         },
      ],
      [
         'missing conversationId',
         { experimental_context: { user: { id: 1, role: { isAdmin: true, permissions: [] } } } },
      ],
   ])('throws on %s', (_label, options) => {
      expect(() => getToolContext(options as never)).toThrow(/without an authenticated actor/);
   });
});

describe('assertToolPermission', () => {
   it('lets an admin role through without explicit grants', () => {
      const ctx = adminContext();

      expect(
         assertToolPermission(toolOptions(ctx), PermissionResource.users, PermissionAction.delete),
      ).toMatchObject(ctx);
   });

   it('lets a role with the matching grant through', () => {
      const ctx = contextWithGrants([
         { resource: PermissionResource.projects, action: PermissionAction.update },
      ]);

      expect(
         assertToolPermission(
            toolOptions(ctx),
            PermissionResource.projects,
            PermissionAction.update,
         ),
      ).toMatchObject(ctx);
   });

   it('rejects a role whose grant is for a different action on the same resource', () => {
      const ctx = contextWithGrants([
         { resource: PermissionResource.projects, action: PermissionAction.read },
      ]);

      expect(() =>
         assertToolPermission(
            toolOptions(ctx),
            PermissionResource.projects,
            PermissionAction.delete,
         ),
      ).toThrow(new ToolPermissionError(PermissionResource.projects, PermissionAction.delete));
   });

   it('rejects a role with no grants at all', () => {
      expect(() =>
         assertToolPermission(
            toolOptions(noPermissionContext()),
            PermissionResource.tags,
            PermissionAction.read,
         ),
      ).toThrow('Insufficient permissions: tags.read');
   });

   it('treats a missing context as no permission', () => {
      expect(() =>
         assertToolPermission(undefined, PermissionResource.tags, PermissionAction.read),
      ).toThrow(/without an authenticated actor/);
   });
});

describe('toToolActor', () => {
   it('keeps only id, isAdmin and the resource/action pairs', () => {
      const user = {
         id: 7,
         email: 'someone@example.com',
         firstName: 'A',
         role: {
            id: 2,
            name: 'editor',
            isAdmin: false,
            permissions: [{ roleId: 2, resource: 'projects', action: 'update' }],
         },
      } as unknown as AuthenticatedUser;

      expect(toToolActor(user)).toEqual({
         id: 7,
         role: { isAdmin: false, permissions: [{ resource: 'projects', action: 'update' }] },
      });
   });
});

describe('approvalUnlessDenied', () => {
   const needsApproval = approvalUnlessDenied(PermissionResource.users, PermissionAction.delete);

   it('asks for approval when the caller may perform the action', () => {
      expect(needsApproval({}, toolOptions(adminContext()))).toBe(true);
      expect(
         needsApproval(
            {},
            toolOptions(
               contextWithGrants([
                  { resource: PermissionResource.users, action: PermissionAction.delete },
               ]),
            ),
         ),
      ).toBe(true);
   });

   it('skips the prompt when the caller provably lacks the permission', () => {
      expect(needsApproval({}, toolOptions(noPermissionContext()))).toBe(false);
   });

   it('keeps the prompt when the context is missing or malformed', () => {
      expect(needsApproval({}, undefined)).toBe(true);
      expect(needsApproval({}, { experimental_context: { user: {} } })).toBe(true);
   });
});
