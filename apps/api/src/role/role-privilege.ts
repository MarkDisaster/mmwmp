import { BadRequestException, ForbiddenException, type HttpException } from '@nestjs/common';

import type { RequiredPermission } from '@/common/decorators/require-permission.decorator';
import { hasPermission } from '@/common/guards/auth.guard';
import type { Prisma } from '@/generated/prisma/client';
import { lockRoleForAssignment } from '@/prisma/aggregate-lock.helper';
import type { PrismaService } from '@/prisma/prisma.service';
import type { SaveErrorMessages } from '@/prisma/save-error.helper';

type Grant = RequiredPermission;
export type PrivilegeRole = { id: number; isAdmin: boolean; permissions: ReadonlyArray<Grant> };

export type PrivilegeActor = { id: number; role: PrivilegeRole };

export const PRIVILEGE_MESSAGES = {
   grantNotHeld: 'Cannot grant permissions you do not have',
   ownRole: 'Cannot modify your own role',
   roleAboveActor: 'Cannot modify a role with permissions you do not have',
   assignRoleAboveActor: 'Cannot assign a role with permissions you do not have',
   ownAccount: 'Cannot modify your own account here, use your profile',
   userAboveActor: 'Cannot modify a user with permissions you do not have',
   otherEmail: 'Only an administrator can change the email of another user',
} as const;

export const holdsAll = (actorRole: PrivilegeRole, permissions: ReadonlyArray<Grant>): boolean =>
   permissions.every((permission) => hasPermission(actorRole, permission));

export const assertCanGrant = (actor: PrivilegeActor, permissions: ReadonlyArray<Grant>): void => {
   if (!holdsAll(actor.role, permissions)) {
      throw new ForbiddenException(PRIVILEGE_MESSAGES.grantNotHeld);
   }
};

export const assertCanManageRole = (actor: PrivilegeActor, role: PrivilegeRole): void => {
   if (actor.role.isAdmin) return;
   if (role.id === actor.role.id) throw new ForbiddenException(PRIVILEGE_MESSAGES.ownRole);
   if (!holdsAll(actor.role, role.permissions)) {
      throw new ForbiddenException(PRIVILEGE_MESSAGES.roleAboveActor);
   }
};

export const assertCanAssignRole = (actor: PrivilegeActor, role: PrivilegeRole): void => {
   if (!holdsAll(actor.role, role.permissions)) {
      throw new ForbiddenException(PRIVILEGE_MESSAGES.assignRoleAboveActor);
   }
};

export const assertCanManageUser = (
   actor: PrivilegeActor,
   target: { id: number; role: PrivilegeRole },
): void => {
   if (target.id === actor.id) throw new ForbiddenException(PRIVILEGE_MESSAGES.ownAccount);
   if (!holdsAll(actor.role, target.role.permissions)) {
      throw new ForbiddenException(PRIVILEGE_MESSAGES.userAboveActor);
   }
};

export const findPrivilegeActor = async (
   client: PrismaService | Prisma.TransactionClient,
   actorId: number,
): Promise<PrivilegeActor> => {
   const actor = await client.user.findFirst({
      where: { id: actorId, deletedAt: null, deactivatedAt: null },
      select: { id: true, role: { include: { permissions: true } } },
   });
   if (!actor) throw new ForbiddenException('Insufficient permissions');
   return actor;
};

export const USER_SAVE_ERRORS: SaveErrorMessages = {
   uniqueTaken: { field: 'email', message: 'User with this email already exists' },
   referenceMissing: 'Role not found',
};

export const findAssignableRole = async (
   tx: Prisma.TransactionClient,
   actor: PrivilegeActor,
   roleId: number,
   adminMessage: string,
   missing: () => HttpException = () => new BadRequestException('Role not found'),
) => {
   if (!(await lockRoleForAssignment(tx, roleId))) throw missing();
   const role = await tx.role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
   });
   if (!role) throw missing();
   if (role.isAdmin) throw new BadRequestException(adminMessage);
   assertCanAssignRole(actor, role);
   return role;
};
