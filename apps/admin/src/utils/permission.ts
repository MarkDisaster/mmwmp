import type { PermissionDto, RoleEntity, UserEntity } from '@/api/generated';

type PermissionLike = { resource: string; action: string };

type RoleLike = Pick<RoleEntity, 'isAdmin' | 'permissions'>;

export const roleHasPermission = (role: RoleLike, { resource, action }: PermissionLike) =>
   role.isAdmin || role.permissions.some((p) => p.resource === resource && p.action === action);

export const isPermissionSubset = (permissions: readonly PermissionLike[], actor: RoleLike) =>
   actor.isAdmin || permissions.every((permission) => roleHasPermission(actor, permission));

export const canAssignRole = (role: RoleLike, actor: RoleLike) =>
   !role.isAdmin && isPermissionSubset(role.permissions, actor);

type UserLike = Pick<UserEntity, 'id'> & { role: RoleLike };

export const canManageUser = (target: UserLike, actor: UserLike) =>
   target.id !== actor.id &&
   !target.role.isAdmin &&
   isPermissionSubset(target.role.permissions, actor.role);

type RoleWithId = RoleLike & Pick<RoleEntity, 'id'>;

export const canManageRole = (role: RoleWithId, actorRole: RoleWithId) =>
   !role.isAdmin &&
   (actorRole.isAdmin ||
      (role.id !== actorRole.id && isPermissionSubset(role.permissions, actorRole)));

export type PublishableResource = Extract<PermissionDto['resource'], 'projects' | 'services'>;

export const getEditLock = (
   role: RoleLike,
   resource: PublishableResource,
   record: { status: string } | undefined,
): 'permission' | 'published' | null => {
   const can = (action: PermissionDto['action']) => roleHasPermission(role, { resource, action });
   if (!record) return can('create') ? null : 'permission';
   if (!can('update')) return 'permission';
   return record.status === 'published' && !can('publish') ? 'published' : null;
};
