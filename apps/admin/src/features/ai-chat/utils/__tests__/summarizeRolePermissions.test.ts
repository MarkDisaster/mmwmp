import { describe, expect, it } from 'vitest';

import { rolePermissionsTargetId, summarizeRolePermissions } from '../summarizeRolePermissions';

const EDITOR = {
   id: 3,
   name: 'Editor',
   permissions: [
      { resource: 'projects', action: 'read' },
      { resource: 'projects', action: 'update' },
      { resource: 'users', action: 'delete' },
   ],
};

const INPUT = {
   id: 3,
   permissions: [
      { resource: 'projects', action: 'update' },
      { resource: 'projects', action: 'read' },
      { resource: 'projects', action: 'publish' },
   ],
};

describe('summarizeRolePermissions', () => {
   it('should say what the call grants and revokes compared with the current role', () => {
      expect(summarizeRolePermissions('setRolePermissions', INPUT, EDITOR)).toEqual({
         roleId: 3,
         roleName: 'Editor',
         diff: {
            grant: [{ resource: 'projects', action: 'publish' }],
            revoke: [{ resource: 'users', action: 'delete' }],
         },
         next: [
            { resource: 'projects', action: 'publish' },
            { resource: 'projects', action: 'read' },
            { resource: 'projects', action: 'update' },
         ],
      });
   });

   it('should report no change when the new set equals the current one', () => {
      const summary = summarizeRolePermissions(
         'setRolePermissions',
         { id: 3, permissions: [...EDITOR.permissions].reverse() },
         EDITOR,
      );
      expect(summary?.diff).toEqual({ grant: [], revoke: [] });
   });

   it('should revoke everything the role holds for an empty set', () => {
      const summary = summarizeRolePermissions(
         'setRolePermissions',
         { id: 3, permissions: [] },
         EDITOR,
      );
      expect(summary?.diff?.grant).toEqual([]);
      expect(summary?.diff?.revoke).toHaveLength(3);
   });

   it('should list the whole new set, deduplicated, when the current role is not known', () => {
      const input = { ...INPUT, permissions: [...INPUT.permissions, INPUT.permissions[0]] };
      expect(summarizeRolePermissions('setRolePermissions', input, undefined)).toEqual({
         roleId: 3,
         roleName: null,
         diff: null,
         next: [
            { resource: 'projects', action: 'publish' },
            { resource: 'projects', action: 'read' },
            { resource: 'projects', action: 'update' },
         ],
      });
   });

   it('should not compare with another role than the one the call changes', () => {
      const summary = summarizeRolePermissions('setRolePermissions', INPUT, { ...EDITOR, id: 4 });
      expect(summary?.diff).toBeNull();
      expect(summary?.roleName).toBeNull();
   });

   it('should leave other tools and malformed inputs to the generic line', () => {
      expect(summarizeRolePermissions('grantRolePermission', INPUT, EDITOR)).toBeNull();
      expect(summarizeRolePermissions('setRolePermissions', { id: 3 }, EDITOR)).toBeNull();
      expect(
         summarizeRolePermissions('setRolePermissions', { id: 3, permissions: ['x'] }, EDITOR),
      ).toBeNull();
   });
});

describe('rolePermissionsTargetId', () => {
   it('should return the role id of setRolePermissions only', () => {
      expect(rolePermissionsTargetId('setRolePermissions', INPUT)).toBe(3);
      expect(rolePermissionsTargetId('deleteRole', { id: 3 })).toBeNull();
      expect(rolePermissionsTargetId('setRolePermissions', { id: '3' })).toBeNull();
   });
});
