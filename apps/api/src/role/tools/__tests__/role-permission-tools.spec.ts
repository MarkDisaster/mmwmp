import { readFileSync } from 'node:fs';
import path from 'node:path';

import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { RoleService } from '../../role.service';
import { GrantRolePermissionTool } from '../grant-role-permission.tool';
import { ListRolesTool } from '../list-roles.tool';
import { RevokeRolePermissionTool } from '../revoke-role-permission.tool';
import { SetRolePermissionsTool } from '../set-role-permissions.tool';

const schemaResources = () => {
   const schema = readFileSync(path.resolve(__dirname, '../../../../prisma/schema.prisma'), 'utf8');
   const body = /enum PermissionResource \{([^}]*)\}/.exec(schema)?.[1];
   if (!body) throw new Error('enum PermissionResource not found in schema.prisma');
   return body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^[a-z_]+$/.test(line));
};

const enumsOf = (node: unknown): string[][] => {
   if (Array.isArray(node)) return node.flatMap(enumsOf);
   if (typeof node !== 'object' || node === null) return [];
   const { enum: values, ...rest } = node as Record<string, unknown>;
   return [...(Array.isArray(values) ? [values as string[]] : []), ...enumsOf(Object.values(rest))];
};

const metaOf = (Class: object) => Reflect.getMetadata(AiTool.KEY, Class) as AiToolMetadata;

const WRITE_TOOLS = [SetRolePermissionsTool, GrantRolePermissionTool, RevokeRolePermissionTool];

describe('role permission tools — resources and actions come from RBAC', () => {
   it.each(WRITE_TOOLS.map((Class) => [metaOf(Class).name, metaOf(Class)] as const))(
      '%s offers the model every resource and action of the RBAC schema',
      (_name, meta) => {
         const enums = enumsOf(z.toJSONSchema(meta.inputSchema)).map((values) =>
            [...values].sort(),
         );

         expect(enums).toContainEqual([...schemaResources()].sort());
         expect(enums).toContainEqual(Object.values(PermissionResource).sort());
         expect(enums).toContainEqual(Object.values(PermissionAction).sort());
      },
   );

   it('keeps the generated enum in step with schema.prisma', () => {
      expect(Object.values(PermissionResource).sort()).toEqual(schemaResources().sort());
   });
});

describe('role permission tools — execute', () => {
   const role = {
      id: 4,
      name: 'editor',
      isSystem: false,
      isAdmin: false,
      updatedAt: new Date(0),
      createdAt: new Date(0),
      permissions: [
         { resource: PermissionResource.tags, action: PermissionAction.read },
         { resource: PermissionResource.audit_logs, action: PermissionAction.read },
      ],
   };
   const sortedPermissions = [
      { resource: 'audit_logs', action: 'read' },
      { resource: 'tags', action: 'read' },
   ];

   const roleService = (overrides: Partial<Record<keyof RoleService, jest.Mock>>) =>
      overrides as unknown as RoleService;

   it('setRolePermissions passes every RBAC resource through and returns the resulting set', async () => {
      const setPermissions = jest.fn().mockResolvedValue(role);
      const permissions = Object.values(PermissionResource).map((resource) => ({
         resource,
         action: PermissionAction.read,
      }));
      const input = metaOf(SetRolePermissionsTool).inputSchema.parse({ id: 4, permissions });

      const result = await new SetRolePermissionsTool(roleService({ setPermissions })).execute(
         adminContext(),
         input as { id: number; permissions: typeof permissions },
      );

      expect(setPermissions).toHaveBeenCalledWith(4, { permissions }, 1);
      expect(result).toEqual({ id: 4, name: 'editor', permissions: sortedPermissions });
   });

   it('grantRolePermission grants one permission and reports whether it changed anything', async () => {
      const grantPermission = jest.fn().mockResolvedValue({ changed: false, role });

      const result = await new GrantRolePermissionTool(roleService({ grantPermission })).execute(
         adminContext(),
         { roleId: 4, resource: PermissionResource.runner_scores, action: PermissionAction.update },
      );

      expect(grantPermission).toHaveBeenCalledWith(
         4,
         { resource: PermissionResource.runner_scores, action: PermissionAction.update },
         1,
      );
      expect(result).toEqual({
         id: 4,
         name: 'editor',
         granted: false,
         permissions: sortedPermissions,
      });
   });

   it('revokeRolePermission relays the admin-role refusal with its message', async () => {
      const revokePermission = jest
         .fn()
         .mockRejectedValue(new BadRequestException('Cannot modify admin role permissions'));

      await expect(
         new RevokeRolePermissionTool(roleService({ revokePermission })).execute(adminContext(), {
            roleId: 1,
            resource: PermissionResource.tags,
            action: PermissionAction.read,
         }),
      ).rejects.toThrow(/^Cannot modify admin role permissions$/);
   });

   it('listRoles returns the permissions of each role instead of a count', async () => {
      const findAll = jest.fn().mockResolvedValue({ data: [role], totalCount: 1 });

      const result = await new ListRolesTool(roleService({ findAll })).execute(adminContext(), {});

      expect(result.items[0]).toMatchObject({ id: 4, permissions: sortedPermissions });
      expect(result.items[0]).not.toHaveProperty('permissionCount');
   });
});
