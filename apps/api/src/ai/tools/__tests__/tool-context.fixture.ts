import type { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { ToolActor, ToolContext } from '../tool-auth';

export const TEST_CONVERSATION_ID = 'conv-test';

type Grant = { resource: PermissionResource; action: PermissionAction };

export const toolOptions = (ctx: ToolContext) => ({ experimental_context: ctx });

const storedRoles = new Map<number, ToolActor['role']>();

const contextOf = (id: number, role: ToolActor['role']): ToolContext => {
   storedRoles.set(id, role);
   return { user: { id, role }, conversationId: TEST_CONVERSATION_ID };
};

export const adminContext = (): ToolContext => contextOf(1, { isAdmin: true, permissions: [] });

export const contextWithGrants = (grants: Grant[]): ToolContext =>
   contextOf(2, { isAdmin: false, permissions: grants });

export const noPermissionContext = (): ToolContext => contextWithGrants([]);

export const adminToolOptions = () => toolOptions(adminContext());

export const mockToolAudit = () => ({
   log: jest.fn().mockResolvedValue(undefined),
   logToolSuccess: jest.fn().mockResolvedValue(undefined),
   logToolFailure: jest.fn().mockResolvedValue(undefined),
});

export const mockToolPrisma = (active = true) => ({
   project: { findFirst: jest.fn().mockResolvedValue({ status: 'published' }) },
   service: { findFirst: jest.fn().mockResolvedValue({ status: 'published' }) },
   user: {
      findFirst: jest.fn(({ where }: { where: { id: number } }) =>
         Promise.resolve(
            active
               ? {
                    id: where.id,
                    role: storedRoles.get(where.id) ?? { isAdmin: false, permissions: [] },
                 }
               : null,
         ),
      ),
   },
});

export const mockEditLocks = () => ({ isHeldByOther: jest.fn().mockResolvedValue(false) });
