import { PrismaService } from '../../../src/prisma/prisma.service';
import { RoleService } from '../../../src/role/role.service';
import { getApp, getHttpServer } from '../../setup/init';
import { holdRowLock, startRequest, waitForLockWait } from '../../setup/locks';
import { createAdminAndLogin, createTestUser, getRoleId } from '../../setup/users';

describe('Role permissions (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { isSystem: false } });
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const adminId = async () =>
      (
         (await prisma.user.findUnique({ where: { email: 'admin@test.com' } })) ??
         (await createTestUser())
      ).id;

   const setPermissions = (token: string, roleId: number, permissions: unknown[]) =>
      getHttpServer()
         .put(`/roles/${roleId}/permissions`)
         .set('Authorization', `Bearer ${token}`)
         .send({ permissions });

   it('should give the editor role its default permissions without config', async () => {
      const token = await createAdminAndLogin();

      const response = await getHttpServer()
         .get(`/roles/${await getRoleId('editor')}`)
         .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const permissions = (response.body.permissions as Array<{ resource: string; action: string }>)
         .map(({ resource, action }) => `${resource}:${action}`)
         .sort();
      expect(permissions).toEqual([
         'contact:read',
         'files:create',
         'files:read',
         'projects:create',
         'projects:read',
         'projects:update',
         'services:create',
         'services:read',
         'services:update',
         'tags:create',
         'tags:read',
         'tags:update',
      ]);
   });

   it('should reject the removed resource config with 400 and keep the permissions', async () => {
      const token = await createAdminAndLogin();
      const role = await prisma.role.create({
         data: { name: 'custom', permissions: { create: [{ resource: 'tags', action: 'read' }] } },
      });

      const response = await setPermissions(token, role.id, [
         { resource: 'tags', action: 'read' },
         { resource: 'config', action: 'read' },
      ]);

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body.message)).toContain('resource');
      const stored = await prisma.rolePermission.findMany({ where: { roleId: role.id } });
      expect(stored.map(({ resource, action }) => `${resource}:${action}`)).toEqual(['tags:read']);
   });

   it('should replace the permissions with every remaining resource', async () => {
      const token = await createAdminAndLogin();
      const role = await prisma.role.create({ data: { name: 'custom' } });
      const resources = [
         'projects',
         'services',
         'tags',
         'files',
         'users',
         'roles',
         'contact',
         'audit_logs',
         'runner_scores',
      ];

      const response = await setPermissions(
         token,
         role.id,
         resources.map((resource) => ({ resource, action: 'read' })),
      );

      expect(response.status).toBe(200);
      expect(
         (response.body.permissions as Array<{ resource: string }>)
            .map(({ resource }) => resource)
            .sort(),
      ).toEqual([...resources].sort());
   });

   it('should refuse a permission that nothing checks with 400 and keep the permissions', async () => {
      const token = await createAdminAndLogin();
      const role = await prisma.role.create({
         data: { name: 'custom', permissions: { create: [{ resource: 'tags', action: 'read' }] } },
      });

      const response = await setPermissions(token, role.id, [
         { resource: 'tags', action: 'read' },
         { resource: 'tags', action: 'publish' },
         { resource: 'files', action: 'publish' },
      ]);

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body.message)).toContain('tags.publish, files.publish');
      const stored = await prisma.rolePermission.findMany({ where: { roleId: role.id } });
      expect(stored.map(({ resource, action }) => `${resource}:${action}`)).toEqual(['tags:read']);
   });

   describe('RoleService.grantPermission / revokePermission (AI tools)', () => {
      it('should refuse to grant a permission that nothing checks', async () => {
         const role = await prisma.role.create({ data: { name: 'custom' } });

         await expect(
            getApp()
               .get(RoleService)
               .grantPermission(role.id, { resource: 'tags', action: 'publish' }, await adminId()),
         ).rejects.toThrow('Not a permission: tags.publish');
         expect(await prisma.rolePermission.count({ where: { roleId: role.id } })).toBe(0);
      });

      const permissionsOf = async (roleId: number) =>
         (await prisma.rolePermission.findMany({ where: { roleId } }))
            .map(({ resource, action }) => `${resource}:${action}`)
            .sort();

      it('should grant one permission and keep the others, also those of the newer resources', async () => {
         const role = await prisma.role.create({
            data: {
               name: 'custom',
               permissions: {
                  create: [
                     { resource: 'audit_logs', action: 'read' },
                     { resource: 'runner_scores', action: 'update' },
                  ],
               },
            },
         });
         const roles = getApp().get(RoleService);

         const first = await roles.grantPermission(
            role.id,
            { resource: 'tags', action: 'read' },
            await adminId(),
         );
         const again = await roles.grantPermission(
            role.id,
            { resource: 'tags', action: 'read' },
            await adminId(),
         );

         expect(first.changed).toBe(true);
         expect(again.changed).toBe(false);
         expect(await permissionsOf(role.id)).toEqual([
            'audit_logs:read',
            'runner_scores:update',
            'tags:read',
         ]);
      });

      it('should revoke one permission and keep the others', async () => {
         const role = await prisma.role.create({
            data: {
               name: 'custom',
               permissions: {
                  create: [
                     { resource: 'audit_logs', action: 'read' },
                     { resource: 'tags', action: 'read' },
                  ],
               },
            },
         });
         const roles = getApp().get(RoleService);

         const first = await roles.revokePermission(
            role.id,
            { resource: 'tags', action: 'read' },
            await adminId(),
         );
         const again = await roles.revokePermission(
            role.id,
            { resource: 'tags', action: 'read' },
            await adminId(),
         );

         expect(first.changed).toBe(true);
         expect(again.changed).toBe(false);
         expect(await permissionsOf(role.id)).toEqual(['audit_logs:read']);
      });

      it('should refuse to change the admin role', async () => {
         const roles = getApp().get(RoleService);
         const adminRoleId = await getRoleId('admin');

         await expect(
            roles.grantPermission(
               adminRoleId,
               { resource: 'tags', action: 'read' },
               await adminId(),
            ),
         ).rejects.toThrow('Cannot modify admin role permissions');
         await expect(
            roles.revokePermission(
               adminRoleId,
               { resource: 'tags', action: 'read' },
               await adminId(),
            ),
         ).rejects.toThrow('Cannot modify admin role permissions');
      });
   });

   describe('overlapping writes of one permission set', () => {
      const permissionsOf = async (roleId: number) =>
         (await prisma.rolePermission.findMany({ where: { roleId } }))
            .map(({ resource, action }) => `${resource}:${action}`)
            .sort();

      const customRole = () =>
         prisma.role.create({
            data: {
               name: 'custom',
               permissions: { create: [{ resource: 'tags', action: 'read' }] },
            },
         });

      it('should run two replacements one after the other, never leaving their union', async () => {
         const token = await createAdminAndLogin();
         const role = await customRole();
         const lock = await holdRowLock('roles', role.id);

         const first = startRequest(
            setPermissions(token, role.id, [{ resource: 'projects', action: 'read' }]),
         );
         const second = startRequest(
            setPermissions(token, role.id, [{ resource: 'services', action: 'read' }]),
         );
         await waitForLockWait(prisma, 4_000, 2);
         expect(first.isSettled() || second.isSettled()).toBe(false);

         await lock.release();
         const responses = await Promise.all([first.promise, second.promise]);

         expect(responses.map((r) => r.status)).toEqual([200, 200]);
         expect([['projects:read'], ['services:read']]).toContainEqual(
            await permissionsOf(role.id),
         );
      });

      it('should make grant and revoke wait for a replacement of the same role', async () => {
         const role = await customRole();
         const roles = getApp().get(RoleService);
         await createAdminAndLogin();
         const actor = await adminId();
         const lock = await holdRowLock('roles', role.id);

         const grant = startRequest(
            roles.grantPermission(role.id, { resource: 'files', action: 'read' }, actor),
         );
         const revoke = startRequest(
            roles.revokePermission(role.id, { resource: 'tags', action: 'read' }, actor),
         );
         await waitForLockWait(prisma, 4_000, 2);
         expect(grant.isSettled() || revoke.isSettled()).toBe(false);

         await lock.release();
         const [granted, revoked] = await Promise.all([grant.promise, revoke.promise]);

         expect([granted.changed, revoked.changed]).toEqual([true, true]);
         expect(await permissionsOf(role.id)).toEqual(['files:read']);
      });
   });
});
