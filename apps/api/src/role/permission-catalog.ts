import { BadRequestException } from '@nestjs/common';

import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

export const PERMISSION_CATALOG: Record<PermissionResource, readonly PermissionAction[]> = {
   [PermissionResource.projects]: [
      PermissionAction.read,
      PermissionAction.create,
      PermissionAction.update,
      PermissionAction.delete,
      PermissionAction.publish,
   ],
   [PermissionResource.services]: [
      PermissionAction.read,
      PermissionAction.create,
      PermissionAction.update,
      PermissionAction.delete,
      PermissionAction.publish,
   ],
   [PermissionResource.tags]: [
      PermissionAction.read,
      PermissionAction.create,
      PermissionAction.update,
      PermissionAction.delete,
   ],
   [PermissionResource.files]: [
      PermissionAction.read,
      PermissionAction.create,
      PermissionAction.update,
      PermissionAction.delete,
   ],
   [PermissionResource.users]: [
      PermissionAction.read,
      PermissionAction.create,
      PermissionAction.update,
      PermissionAction.delete,
   ],
   [PermissionResource.roles]: [
      PermissionAction.read,
      PermissionAction.create,
      PermissionAction.update,
      PermissionAction.delete,
   ],
   [PermissionResource.contact]: [PermissionAction.read, PermissionAction.update],
   [PermissionResource.audit_logs]: [PermissionAction.read],
   [PermissionResource.runner_scores]: [
      PermissionAction.read,
      PermissionAction.update,
      PermissionAction.delete,
   ],
};

type Permission = { resource: PermissionResource; action: PermissionAction };

const isKnownPermission = ({ resource, action }: Permission): boolean =>
   PERMISSION_CATALOG[resource].includes(action);

export const assertKnownPermissions = (permissions: readonly Permission[]): void => {
   const unknown = permissions.filter((permission) => !isKnownPermission(permission));
   if (unknown.length > 0) {
      const list = unknown.map(({ resource, action }) => `${resource}.${action}`).join(', ');
      throw new BadRequestException(`Not a permission: ${list}`);
   }
};
