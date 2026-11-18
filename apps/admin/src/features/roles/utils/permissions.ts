import type {
   PermissionDto,
   PermissionDtoActionEnumKey,
   PermissionDtoResourceEnumKey,
} from '@/api/generated';
import { permissionDtoActionEnum, permissionDtoResourceEnum } from '@/api/generated';
import { isPermissionOffered } from '@/features/roles/constants';

export type PermissionEntry = PermissionDto;

const RESOURCES = new Set<string>(Object.values(permissionDtoResourceEnum));
const ACTIONS = new Set<string>(Object.values(permissionDtoActionEnum));

const isResource = (value: string): value is PermissionDtoResourceEnumKey => RESOURCES.has(value);
const isAction = (value: string): value is PermissionDtoActionEnumKey => ACTIONS.has(value);

export const toPermissionEntries = (
   permissions: readonly { resource: string; action: string }[],
): PermissionEntry[] =>
   permissions.flatMap(({ resource, action }) =>
      isResource(resource) && isAction(action) && isPermissionOffered(resource, action)
         ? [{ resource, action }]
         : [],
   );

export const hasPermission = (
   permissions: readonly PermissionEntry[],
   { resource, action }: PermissionEntry,
) => permissions.some((p) => p.resource === resource && p.action === action);

export const togglePermission = (
   permissions: readonly PermissionEntry[],
   entry: PermissionEntry,
): PermissionEntry[] =>
   hasPermission(permissions, entry)
      ? permissions.filter((p) => !(p.resource === entry.resource && p.action === entry.action))
      : [...permissions, entry];
