import type { ToolExecutionOptions } from 'ai';

import { type AuthenticatedUser, hasPermission } from '@/common/guards/auth.guard';
import type { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

export type ToolActor = {
   id: number;
   role: {
      isAdmin: boolean;
      permissions: ReadonlyArray<{ resource: string; action: string }>;
   };
};

export type ToolContext = {
   user: ToolActor;
   conversationId: string;
   ipAddress?: string | null;
   userAgent?: string | null;
};

type ToolOptions = Pick<ToolExecutionOptions, 'experimental_context'>;

export class ToolPermissionError extends Error {
   constructor(resource: PermissionResource, action: PermissionAction) {
      super(`Insufficient permissions: ${resource}.${action}`);
      this.name = 'ToolPermissionError';
   }
}

export const toToolActor = (user: AuthenticatedUser): ToolActor => ({
   id: user.id,
   role: {
      isAdmin: user.role.isAdmin,
      permissions: user.role.permissions.map(({ resource, action }) => ({ resource, action })),
   },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
   typeof value === 'object' && value !== null;

const isToolActor = (value: unknown): value is ToolActor => {
   if (!isRecord(value) || typeof value.id !== 'number' || !isRecord(value.role)) {
      return false;
   }
   return typeof value.role.isAdmin === 'boolean' && Array.isArray(value.role.permissions);
};

const optionalString = (value: unknown): string | null =>
   typeof value === 'string' ? value : null;

export const getToolContext = (options: ToolOptions | undefined): ToolContext => {
   const ctx = options?.experimental_context;

   if (!isRecord(ctx) || !isToolActor(ctx.user) || typeof ctx.conversationId !== 'string') {
      throw new Error('AI tool invoked without an authenticated actor context.');
   }

   return {
      user: ctx.user,
      conversationId: ctx.conversationId,
      ipAddress: optionalString(ctx.ipAddress),
      userAgent: optionalString(ctx.userAgent),
   };
};

export const assertToolPermission = (
   options: ToolOptions | undefined,
   resource: PermissionResource,
   action: PermissionAction,
): ToolContext => {
   const ctx = getToolContext(options);

   if (!hasPermission(ctx.user.role, { resource, action })) {
      throw new ToolPermissionError(resource, action);
   }

   return ctx;
};

export const hasToolPermission = (
   ctx: ToolContext,
   resource: PermissionResource,
   action: PermissionAction,
): boolean => hasPermission(ctx.user.role, { resource, action });

export const assertToolAdmin = (options: ToolOptions | undefined): ToolContext => {
   const ctx = getToolContext(options);
   if (!ctx.user.role.isAdmin) {
      throw new Error('Insufficient permissions: admin role required');
   }
   return ctx;
};

export const approvalUnlessDenied =
   (resource: PermissionResource, action: PermissionAction) =>
   (_input: unknown, options: ToolOptions | undefined): boolean => {
      try {
         assertToolPermission(options, resource, action);
         return true;
      } catch (error) {
         return !(error instanceof ToolPermissionError);
      }
   };
