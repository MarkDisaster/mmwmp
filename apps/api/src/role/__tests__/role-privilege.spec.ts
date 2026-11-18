import { ForbiddenException } from '@nestjs/common';

import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import {
   assertCanAssignRole,
   assertCanGrant,
   assertCanManageRole,
   assertCanManageUser,
   holdsAll,
   PRIVILEGE_MESSAGES,
   type PrivilegeActor,
} from '../role-privilege';

const grant = (resource: PermissionResource, action: PermissionAction) => ({ resource, action });

const USERS_UPDATE = grant(PermissionResource.users, PermissionAction.update);
const ROLES_UPDATE = grant(PermissionResource.roles, PermissionAction.update);
const PROJECTS_READ = grant(PermissionResource.projects, PermissionAction.read);
const AUDIT_READ = grant(PermissionResource.audit_logs, PermissionAction.read);

const manager: PrivilegeActor = {
   id: 10,
   role: { id: 3, isAdmin: false, permissions: [USERS_UPDATE, ROLES_UPDATE, PROJECTS_READ] },
};
const admin: PrivilegeActor = { id: 1, role: { id: 1, isAdmin: true, permissions: [] } };

const role = (
   id: number,
   permissions: { resource: PermissionResource; action: PermissionAction }[],
) => ({
   id,
   isAdmin: false,
   permissions,
});

describe('holdsAll', () => {
   it('holds a subset of the own permissions, the empty set included', () => {
      expect(holdsAll(manager.role, [PROJECTS_READ])).toBe(true);
      expect(holdsAll(manager.role, [])).toBe(true);
   });

   it('does not hold a permission outside the own ones', () => {
      expect(holdsAll(manager.role, [PROJECTS_READ, AUDIT_READ])).toBe(false);
   });

   it('holds everything as an admin', () => {
      expect(holdsAll(admin.role, [AUDIT_READ, ROLES_UPDATE])).toBe(true);
   });
});

describe('assertCanGrant', () => {
   it('lets the actor grant permissions they hold', () => {
      expect(() => assertCanGrant(manager, [PROJECTS_READ, USERS_UPDATE])).not.toThrow();
   });

   it('refuses a permission the actor does not hold (escalation)', () => {
      expect(() => assertCanGrant(manager, [AUDIT_READ])).toThrow(
         new ForbiddenException(PRIVILEGE_MESSAGES.grantNotHeld),
      );
   });

   it('lets an admin grant anything', () => {
      expect(() => assertCanGrant(admin, [AUDIT_READ])).not.toThrow();
   });
});

describe('assertCanManageRole', () => {
   it("refuses the actor's own role", () => {
      expect(() => assertCanManageRole(manager, role(3, []))).toThrow(
         new ForbiddenException(PRIVILEGE_MESSAGES.ownRole),
      );
   });

   it('refuses a role with a permission the actor does not hold', () => {
      expect(() => assertCanManageRole(manager, role(4, [AUDIT_READ]))).toThrow(
         new ForbiddenException(PRIVILEGE_MESSAGES.roleAboveActor),
      );
   });

   it("allows another role within the actor's permissions", () => {
      expect(() => assertCanManageRole(manager, role(4, [PROJECTS_READ]))).not.toThrow();
   });

   it('allows an admin every role, their own included', () => {
      expect(() => assertCanManageRole(admin, role(1, [AUDIT_READ]))).not.toThrow();
   });
});

describe('assertCanAssignRole', () => {
   it("allows a role within the actor's permissions, the actor's own role included", () => {
      expect(() =>
         assertCanAssignRole(manager, role(3, [USERS_UPDATE, ROLES_UPDATE, PROJECTS_READ])),
      ).not.toThrow();
   });

   it('refuses a stronger role', () => {
      expect(() => assertCanAssignRole(manager, role(5, [PROJECTS_READ, AUDIT_READ]))).toThrow(
         new ForbiddenException(PRIVILEGE_MESSAGES.assignRoleAboveActor),
      );
   });
});

describe('assertCanManageUser', () => {
   it('refuses the actor themselves, an admin too', () => {
      expect(() => assertCanManageUser(manager, { id: 10, role: role(3, []) })).toThrow(
         new ForbiddenException(PRIVILEGE_MESSAGES.ownAccount),
      );
      expect(() => assertCanManageUser(admin, { id: 1, role: role(1, []) })).toThrow(
         ForbiddenException,
      );
   });

   it('refuses a user whose role has a permission the actor does not hold', () => {
      expect(() => assertCanManageUser(manager, { id: 20, role: role(5, [AUDIT_READ]) })).toThrow(
         new ForbiddenException(PRIVILEGE_MESSAGES.userAboveActor),
      );
   });

   it("allows another user within the actor's permissions", () => {
      expect(() =>
         assertCanManageUser(manager, { id: 20, role: role(2, [PROJECTS_READ]) }),
      ).not.toThrow();
   });
});
