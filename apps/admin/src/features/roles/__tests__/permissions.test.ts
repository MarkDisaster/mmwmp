import { describe, expect, it } from 'vitest';

import {
   hasPermission,
   type PermissionEntry,
   togglePermission,
   toPermissionEntries,
} from '../utils/permissions';

const readProjects: PermissionEntry = { resource: 'projects', action: 'read' };
const readAuditLogs: PermissionEntry = { resource: 'audit_logs', action: 'read' };

describe('toPermissionEntries', () => {
   it('should keep the pairs the API accepts and drop the id', () => {
      const stored = [
         { id: 1, resource: 'projects', action: 'read' },
         { id: 2, resource: 'audit_logs', action: 'read' },
      ];

      expect(toPermissionEntries(stored)).toEqual([readProjects, readAuditLogs]);
   });

   it('should drop a pair that the matrix does not offer, so saving the role is not refused', () => {
      expect(
         toPermissionEntries([
            { resource: 'projects', action: 'publish' },
            { resource: 'tags', action: 'publish' },
            { resource: 'files', action: 'publish' },
         ]),
      ).toEqual([{ resource: 'projects', action: 'publish' }]);
   });

   it('should drop a pair with an unknown resource or action', () => {
      expect(
         toPermissionEntries([
            { resource: 'invoices', action: 'read' },
            { resource: 'projects', action: 'archive' },
         ]),
      ).toEqual([]);
   });
});

describe('togglePermission', () => {
   it('should add a missing pair', () => {
      expect(togglePermission([readAuditLogs], readProjects)).toEqual([
         readAuditLogs,
         readProjects,
      ]);
   });

   it('should remove a present pair and keep the others', () => {
      expect(togglePermission([readAuditLogs, readProjects], { ...readProjects })).toEqual([
         readAuditLogs,
      ]);
   });

   it('should not mutate the given list', () => {
      const permissions = [readProjects];
      togglePermission(permissions, readAuditLogs);
      expect(permissions).toEqual([readProjects]);
   });
});

describe('hasPermission', () => {
   it('should match by resource and action', () => {
      expect(hasPermission([readProjects], { resource: 'projects', action: 'read' })).toBe(true);
      expect(hasPermission([readProjects], { resource: 'projects', action: 'update' })).toBe(false);
      expect(hasPermission([readProjects], { resource: 'tags', action: 'read' })).toBe(false);
   });
});
