import type { PermissionDtoActionEnumKey, PermissionDtoResourceEnumKey } from '@/api/generated';

export const RESOURCE_ACTIONS = {
   projects: ['read', 'create', 'update', 'delete', 'publish'],
   services: ['read', 'create', 'update', 'delete', 'publish'],
   tags: ['read', 'create', 'update', 'delete'],
   files: ['read', 'create', 'update', 'delete'],
   users: ['read', 'create', 'update', 'delete'],
   contact: ['read', 'update'],
   runner_scores: ['read', 'update', 'delete'],
   roles: ['read', 'create', 'update', 'delete'],
   audit_logs: ['read'],
} as const satisfies Partial<
   Record<PermissionDtoResourceEnumKey, readonly PermissionDtoActionEnumKey[]>
>;

export type PermissionResource = keyof typeof RESOURCE_ACTIONS;

export const isPermissionOffered = (
   resource: PermissionDtoResourceEnumKey,
   action: PermissionDtoActionEnumKey,
): boolean =>
   resource in RESOURCE_ACTIONS &&
   (
      RESOURCE_ACTIONS[resource as PermissionResource] as readonly PermissionDtoActionEnumKey[]
   ).includes(action);
