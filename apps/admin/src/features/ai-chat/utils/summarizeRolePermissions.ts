import { isRecord } from '@/features/ai-chat/utils/isRecord';

export type PermissionPair = { resource: string; action: string };

export type CurrentRole = { id: number; name: string; permissions: readonly PermissionPair[] };

export type RolePermissionsSummary = {
   roleId: number;
   roleName: string | null;
   diff: { grant: PermissionPair[]; revoke: PermissionPair[] } | null;
   next: PermissionPair[];
};

const isPair = (value: unknown): value is PermissionPair =>
   isRecord(value) && typeof value.resource === 'string' && typeof value.action === 'string';

const keyOf = ({ resource, action }: PermissionPair) => `${resource}.${action}`;

const sortPairs = (pairs: PermissionPair[]) =>
   pairs.sort((a, b) => a.resource.localeCompare(b.resource) || a.action.localeCompare(b.action));

const uniquePairs = (pairs: readonly PermissionPair[]): PermissionPair[] => {
   const byKey = new Map(
      pairs.map(({ resource, action }) => [keyOf({ resource, action }), { resource, action }]),
   );
   return sortPairs([...byKey.values()]);
};

export const rolePermissionsTargetId = (toolName: string, input: unknown): number | null =>
   toolName === 'setRolePermissions' && isRecord(input) && typeof input.id === 'number'
      ? input.id
      : null;

export const summarizeRolePermissions = (
   toolName: string,
   input: unknown,
   current: CurrentRole | undefined,
): RolePermissionsSummary | null => {
   if (toolName !== 'setRolePermissions' || !isRecord(input)) return null;
   const { id, permissions } = input;
   if (typeof id !== 'number' || !Array.isArray(permissions) || !permissions.every(isPair)) {
      return null;
   }

   const next = uniquePairs(permissions);
   const role = current?.id === id ? current : undefined;
   if (!role) return { roleId: id, roleName: null, diff: null, next };

   const held = uniquePairs(role.permissions.filter(isPair));
   const heldKeys = new Set(held.map(keyOf));
   const nextKeys = new Set(next.map(keyOf));
   return {
      roleId: id,
      roleName: role.name,
      diff: {
         grant: next.filter((pair) => !heldKeys.has(keyOf(pair))),
         revoke: held.filter((pair) => !nextKeys.has(keyOf(pair))),
      },
      next,
   };
};
