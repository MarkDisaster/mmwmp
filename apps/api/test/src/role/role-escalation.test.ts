import type { PermissionAction, PermissionResource } from '../../../prisma/generated/prisma/enums';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { GrantRolePermissionTool } from '../../../src/role/tools/grant-role-permission.tool';
import { SetRolePermissionsTool } from '../../../src/role/tools/set-role-permissions.tool';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin, createTestUser, loginAs } from '../../setup/users';

type Grant = { resource: PermissionResource; action: PermissionAction };

const grantsOf = (permissions: Grant[]) =>
   permissions.map(({ resource, action }) => `${resource}:${action}`).sort();

describe('Role privilege escalation (e2e)', () => {
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

   const MANAGER_GRANTS: Grant[] = [
      { resource: 'roles', action: 'read' },
      { resource: 'roles', action: 'create' },
      { resource: 'roles', action: 'update' },
      { resource: 'roles', action: 'delete' },
      { resource: 'projects', action: 'read' },
   ];

   const setup = async () => {
      const managerRole = await prisma.role.create({
         data: { name: 'manager', permissions: { create: MANAGER_GRANTS } },
      });
      const lowerRole = await prisma.role.create({
         data: {
            name: 'lower',
            permissions: { create: [{ resource: 'projects', action: 'read' }] },
         },
      });
      const higherRole = await prisma.role.create({
         data: {
            name: 'higher',
            permissions: { create: [{ resource: 'audit_logs', action: 'read' }] },
         },
      });
      await createTestUser({ email: 'manager@test.com', role: 'manager' });
      const token = await loginAs('manager@test.com');
      return { managerRole, lowerRole, higherRole, token };
   };

   const storedGrants = async (roleId: number) =>
      grantsOf(await prisma.rolePermission.findMany({ where: { roleId } }));

   const setPermissions = (token: string, roleId: number, permissions: Grant[]) =>
      getHttpServer()
         .put(`/roles/${roleId}/permissions`)
         .set('Authorization', `Bearer ${token}`)
         .send({ permissions });

   it('should refuse to add to the own role and leave it as it was', async () => {
      const { managerRole, token } = await setup();

      const response = await setPermissions(token, managerRole.id, [
         ...MANAGER_GRANTS,
         { resource: 'users', action: 'update' },
      ]);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Cannot modify your own role');
      expect(await storedGrants(managerRole.id)).toEqual(grantsOf(MANAGER_GRANTS));
   });

   it('should refuse to rename or delete the own role', async () => {
      const { managerRole, token } = await setup();

      const rename = await getHttpServer()
         .patch(`/roles/${managerRole.id}`)
         .set('Authorization', `Bearer ${token}`)
         .send({ name: 'boss' });
      const remove = await getHttpServer()
         .delete(`/roles/${managerRole.id}`)
         .set('Authorization', `Bearer ${token}`);

      expect(rename.status).toBe(403);
      expect(remove.status).toBe(403);
      expect((await prisma.role.findUniqueOrThrow({ where: { id: managerRole.id } })).name).toBe(
         'manager',
      );
   });

   it('should refuse to grant another role a permission the caller does not hold', async () => {
      const { lowerRole, token } = await setup();

      const response = await setPermissions(token, lowerRole.id, [
         { resource: 'projects', action: 'read' },
         { resource: 'users', action: 'delete' },
      ]);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Cannot grant permissions you do not have');
      expect(await storedGrants(lowerRole.id)).toEqual(['projects:read']);
   });

   it('should refuse to touch a role above the caller (also only revoking)', async () => {
      const { higherRole, token } = await setup();

      const response = await setPermissions(token, higherRole.id, []);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Cannot modify a role with permissions you do not have');
      expect(await storedGrants(higherRole.id)).toEqual(['audit_logs:read']);
   });

   it('should let the caller grant permissions they hold to a role below them', async () => {
      const { lowerRole, token } = await setup();

      const response = await setPermissions(token, lowerRole.id, [
         { resource: 'projects', action: 'read' },
         { resource: 'roles', action: 'read' },
      ]);

      expect(response.status).toBe(200);
      expect(await storedGrants(lowerRole.id)).toEqual(['projects:read', 'roles:read']);
   });

   it('should create a role with its author and fill it only within the caller', async () => {
      const { token } = await setup();
      const manager = await prisma.user.findUniqueOrThrow({ where: { email: 'manager@test.com' } });

      const created = await getHttpServer()
         .post('/roles')
         .set('Authorization', `Bearer ${token}`)
         .send({ name: 'fresh' });
      const filled = await setPermissions(token, created.body.id, [
         { resource: 'audit_logs', action: 'read' },
      ]);

      expect(created.status).toBe(201);
      expect(created.body.createdById).toBe(manager.id);
      expect(filled.status).toBe(403);
      expect(await storedGrants(created.body.id)).toEqual([]);
   });

   it('should keep the admin role locked and let an admin grant anything elsewhere', async () => {
      const { higherRole } = await setup();
      const adminToken = await createAdminAndLogin();
      const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });

      const lockedAdmin = await setPermissions(adminToken, adminRole.id, []);
      const adminGrant = await setPermissions(adminToken, higherRole.id, [
         { resource: 'users', action: 'delete' },
      ]);

      expect(lockedAdmin.status).toBe(400);
      expect(adminGrant.status).toBe(200);
   });

   describe('AI tools (same service)', () => {
      const managerActor = async () => {
         const user = await prisma.user.findUniqueOrThrow({
            where: { email: 'manager@test.com' },
            include: { role: { include: { permissions: true } } },
         });
         return { user, conversationId: 'conversation' };
      };

      it('should refuse grantRolePermission on the own role and beyond the caller', async () => {
         const { managerRole, lowerRole } = await setup();
         const ctx = await managerActor();
         const tool = getApp().get(GrantRolePermissionTool);

         await expect(
            tool.execute(ctx, { roleId: managerRole.id, resource: 'users', action: 'update' }),
         ).rejects.toThrow('Cannot modify your own role');
         await expect(
            tool.execute(ctx, { roleId: lowerRole.id, resource: 'audit_logs', action: 'read' }),
         ).rejects.toThrow('Cannot grant permissions you do not have');
         expect(await storedGrants(managerRole.id)).toEqual(grantsOf(MANAGER_GRANTS));
         expect(await storedGrants(lowerRole.id)).toEqual(['projects:read']);
      });

      it('should refuse setRolePermissions beyond the caller', async () => {
         const { lowerRole } = await setup();
         const ctx = await managerActor();
         const tool = getApp().get(SetRolePermissionsTool);

         await expect(
            tool.execute(ctx, {
               id: lowerRole.id,
               permissions: [{ resource: 'users', action: 'create' }],
            }),
         ).rejects.toThrow('Cannot grant permissions you do not have');
         expect(await storedGrants(lowerRole.id)).toEqual(['projects:read']);
      });
   });
});
