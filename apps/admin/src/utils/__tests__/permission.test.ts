import { describe, expect, it } from 'vitest';

import {
   canAssignRole,
   canManageRole,
   canManageUser,
   getEditLock,
   isPermissionSubset,
   roleHasPermission,
} from '../permission';

const grant = (resource: string, action: string, id = 1) => ({ id, resource, action });

const ADMIN = { id: 1, isAdmin: true, permissions: [] };
const EDITOR = {
   id: 2,
   isAdmin: false,
   permissions: [
      grant('projects', 'read'),
      grant('projects', 'update', 2),
      grant('tags', 'read', 3),
   ],
};
const READER = { id: 3, isAdmin: false, permissions: [grant('projects', 'read')] };
const PUBLISHER = {
   id: 4,
   isAdmin: false,
   permissions: [grant('projects', 'read'), grant('projects', 'publish', 2)],
};

describe('roleHasPermission', () => {
   it('should let the admin role do everything without a grant', () => {
      const admin = { isAdmin: true, permissions: [] };
      expect(roleHasPermission(admin, { resource: 'services', action: 'publish' })).toBe(true);
   });

   it('should need the explicit grant of the resource and action for another role', () => {
      const editor = {
         isAdmin: false,
         permissions: [grant('services', 'update'), grant('projects', 'publish', 2)],
      };
      expect(roleHasPermission(editor, { resource: 'projects', action: 'publish' })).toBe(true);
      expect(roleHasPermission(editor, { resource: 'services', action: 'update' })).toBe(true);
      expect(roleHasPermission(editor, { resource: 'services', action: 'publish' })).toBe(false);
   });

   it('should deny a role without permissions', () => {
      expect(
         roleHasPermission(
            { isAdmin: false, permissions: [] },
            { resource: 'tags', action: 'read' },
         ),
      ).toBe(false);
   });
});

describe('isPermissionSubset', () => {
   it('should hold when the actor holds every permission', () => {
      expect(isPermissionSubset(READER.permissions, EDITOR)).toBe(true);
      expect(isPermissionSubset([], READER)).toBe(true);
   });

   it('should fail when one permission is missing', () => {
      expect(isPermissionSubset(PUBLISHER.permissions, EDITOR)).toBe(false);
   });

   it('should always hold for the admin role', () => {
      expect(isPermissionSubset(PUBLISHER.permissions, ADMIN)).toBe(true);
   });
});

describe('canAssignRole', () => {
   it('should offer only roles within the permissions of the actor', () => {
      expect(canAssignRole(READER, EDITOR)).toBe(true);
      expect(canAssignRole(EDITOR, EDITOR)).toBe(true);
      expect(canAssignRole(PUBLISHER, EDITOR)).toBe(false);
   });

   it('should never offer the admin role, not even to an admin', () => {
      expect(canAssignRole(ADMIN, ADMIN)).toBe(false);
      expect(canAssignRole(PUBLISHER, ADMIN)).toBe(true);
   });
});

describe('canManageUser', () => {
   const actor = { id: 10, role: EDITOR };

   it('should let the actor manage another user with a subset role', () => {
      expect(canManageUser({ id: 11, role: READER }, actor)).toBe(true);
   });

   it('should not let the actor manage themselves', () => {
      expect(canManageUser({ id: 10, role: READER }, actor)).toBe(false);
   });

   it('should never let anyone manage an admin', () => {
      expect(canManageUser({ id: 11, role: ADMIN }, actor)).toBe(false);
      expect(canManageUser({ id: 11, role: ADMIN }, { id: 10, role: ADMIN })).toBe(false);
   });

   it('should not let the actor manage a user whose role holds more', () => {
      expect(canManageUser({ id: 11, role: PUBLISHER }, actor)).toBe(false);
      expect(canManageUser({ id: 11, role: PUBLISHER }, { id: 10, role: ADMIN })).toBe(true);
   });
});

describe('canManageRole', () => {
   it('should keep the admin role immutable', () => {
      expect(canManageRole(ADMIN, ADMIN)).toBe(false);
   });

   it('should let an admin change any other role', () => {
      expect(canManageRole(PUBLISHER, ADMIN)).toBe(true);
   });

   it('should not let a non-admin change their own role or one holding more', () => {
      expect(canManageRole(EDITOR, EDITOR)).toBe(false);
      expect(canManageRole(PUBLISHER, EDITOR)).toBe(false);
      expect(canManageRole(READER, EDITOR)).toBe(true);
   });
});

describe('getEditLock', () => {
   const updater = {
      isAdmin: false,
      permissions: [grant('projects', 'create'), grant('projects', 'update', 2)],
   };
   const publisher = {
      ...updater,
      permissions: [...updater.permissions, grant('projects', 'publish', 3)],
   };

   it('should lock a new record without the create permission', () => {
      expect(getEditLock(updater, 'projects', undefined)).toBeNull();
      expect(getEditLock(READER, 'projects', undefined)).toBe('permission');
   });

   it('should lock a saved record without the update permission', () => {
      expect(getEditLock(READER, 'projects', { status: 'draft' })).toBe('permission');
   });

   it('should lock a published record without the publish permission, never a draft', () => {
      expect(getEditLock(updater, 'projects', { status: 'draft' })).toBeNull();
      expect(getEditLock(updater, 'projects', { status: 'published' })).toBe('published');
      expect(getEditLock(publisher, 'projects', { status: 'published' })).toBeNull();
   });

   it('should lock nothing for the admin role', () => {
      expect(getEditLock(ADMIN, 'projects', { status: 'published' })).toBeNull();
   });
});
