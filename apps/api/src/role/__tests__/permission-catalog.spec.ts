import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { assertKnownPermissions, PERMISSION_CATALOG } from '../permission-catalog';

describe('permission catalog', () => {
   it('should list every resource', () => {
      expect(Object.keys(PERMISSION_CATALOG).sort()).toEqual(
         Object.values(PermissionResource).sort(),
      );
   });

   it('should offer `publish` only where a status exists', () => {
      const withPublish = Object.values(PermissionResource).filter((resource) =>
         PERMISSION_CATALOG[resource].includes(PermissionAction.publish),
      );

      expect(withPublish.sort()).toEqual(['projects', 'services']);
   });

   describe('assertKnownPermissions', () => {
      it('should accept the permissions of the catalog', () => {
         expect(() =>
            assertKnownPermissions([
               { resource: 'projects', action: 'publish' },
               { resource: 'tags', action: 'delete' },
            ]),
         ).not.toThrow();
      });

      it('should name every pair that is not a permission', () => {
         expect(() =>
            assertKnownPermissions([
               { resource: 'tags', action: 'publish' },
               { resource: 'audit_logs', action: 'delete' },
               { resource: 'projects', action: 'read' },
            ]),
         ).toThrow('Not a permission: tags.publish, audit_logs.delete');
      });
   });
});
