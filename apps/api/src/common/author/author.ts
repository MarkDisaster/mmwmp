import { hasPermission } from '@/common/guards/auth.guard';
import type { Prisma } from '@/generated/prisma/client';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

export const AUTHOR_SELECT = {
   id: true,
   firstName: true,
   lastName: true,
   email: true,
} as const satisfies Prisma.UserSelect;

export type AuthorViewer =
   | {
        id: number;
        role: {
           isAdmin: boolean;
           permissions: ReadonlyArray<{ resource: string; action: string }>;
        };
     }
   | null
   | undefined;

const AUTHOR_KEYS: ReadonlySet<string> = new Set(['createdBy', 'deletedBy', 'user']);

const USERS_READ = { resource: PermissionResource.users, action: PermissionAction.read };

export const canReadUserEmails = (viewer: AuthorViewer): boolean =>
   viewer != null && hasPermission(viewer.role, USERS_READ);

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
   if (typeof value !== 'object' || value === null) return false;
   const proto = Object.getPrototypeOf(value) as unknown;
   return proto === Object.prototype || proto === null;
};

const redact = (value: unknown, viewerId: number | null): unknown => {
   if (Array.isArray(value)) {
      let changed = false;
      const items = value.map((item) => {
         const next = redact(item, viewerId);
         if (next !== item) changed = true;
         return next;
      });
      return changed ? items : value;
   }
   if (!isPlainObject(value)) return value;

   let result: Record<string, unknown> | null = null;
   for (const [key, child] of Object.entries(value)) {
      let next = redact(child, viewerId);
      if (
         AUTHOR_KEYS.has(key) &&
         isPlainObject(next) &&
         'email' in next &&
         (viewerId === null || next.id !== viewerId)
      ) {
         const { email: _email, ...rest } = next;
         next = rest;
      }
      if (next !== child) {
         result ??= { ...value };
         result[key] = next;
      }
   }
   return result ?? value;
};

export const redactAuthorEmails = <T>(value: T, viewer: AuthorViewer): T =>
   canReadUserEmails(viewer) ? value : (redact(value, viewer?.id ?? null) as T);
