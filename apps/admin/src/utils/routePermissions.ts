import { redirect } from '@tanstack/react-router';

import { api } from '@/api';
import type { PermissionDto, RoleEntity } from '@/api/generated';
import type { FileRouteTypes } from '@/routes/routeTree.gen';
import { roleHasPermission } from '@/utils/permission';
import { queryClient } from '@/utils/query-client';

export const ROUTE_PERMISSIONS = {
   '/projects': { resource: 'projects', action: 'read' },
   '/projects/create': { resource: 'projects', action: 'create' },
   '/projects/$projectId': { resource: 'projects', action: 'read' },
   '/services': { resource: 'services', action: 'read' },
   '/services/new': { resource: 'services', action: 'create' },
   '/services/$serviceId': { resource: 'services', action: 'read' },
   '/tags': { resource: 'tags', action: 'read' },
   '/tags/create': { resource: 'tags', action: 'create' },
   '/tags/$tagId': { resource: 'tags', action: 'read' },
   '/users': { resource: 'users', action: 'read' },
   '/roles': { resource: 'roles', action: 'read' },
   '/roles/create': { resource: 'roles', action: 'create' },
   '/roles/$roleId': { resource: 'roles', action: 'read' },
   '/files': { resource: 'files', action: 'read' },
   '/files/upload': { resource: 'files', action: 'create' },
   '/contact': { resource: 'contact', action: 'read' },
   '/audit': { resource: 'audit_logs', action: 'read' },
   '/runner-scores': { resource: 'runner_scores', action: 'read' },
} as const satisfies Partial<Record<FileRouteTypes['to'], PermissionDto>>;

const ANY_OF_ROUTE_PERMISSIONS = {
   '/trash': [
      { resource: 'projects', action: 'delete' },
      { resource: 'services', action: 'delete' },
      { resource: 'tags', action: 'delete' },
      { resource: 'files', action: 'delete' },
   ],
} as const satisfies Partial<Record<FileRouteTypes['to'], readonly PermissionDto[]>>;

export type GuardedRoute = keyof typeof ROUTE_PERMISSIONS | keyof typeof ANY_OF_ROUTE_PERMISSIONS;

export const getRoutePermission = (to: string): PermissionDto | undefined =>
   Object.hasOwn(ROUTE_PERMISSIONS, to)
      ? ROUTE_PERMISSIONS[to as keyof typeof ROUTE_PERMISSIONS]
      : undefined;

const getAnyOfRoutePermissions = (to: string): readonly PermissionDto[] | undefined =>
   Object.hasOwn(ANY_OF_ROUTE_PERMISSIONS, to)
      ? ANY_OF_ROUTE_PERMISSIONS[to as keyof typeof ANY_OF_ROUTE_PERMISSIONS]
      : undefined;

export const isGuardedRoute = (to: string) =>
   !!getRoutePermission(to) || !!getAnyOfRoutePermissions(to);

export const canAccessRoute = (role: Pick<RoleEntity, 'isAdmin' | 'permissions'>, to: string) => {
   const anyOf = getAnyOfRoutePermissions(to);
   if (anyOf) return anyOf.some((permission) => roleHasPermission(role, permission));
   const permission = getRoutePermission(to);
   return !permission || roleHasPermission(role, permission);
};

export const canCurrentUserAccessRoute = (to: string) => {
   const user = queryClient.getQueryData(api.users.queries.me.queryKey);
   return !!user && canAccessRoute(user.role, to);
};

export const requireRoutePermission = (to: GuardedRoute) => async () => {
   const user = await queryClient.ensureQueryData(api.users.queries.me);
   if (!canAccessRoute(user.role, to)) {
      throw redirect({ to: '/', replace: true });
   }
};
