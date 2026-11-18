import { Logger } from '@nestjs/common';
import type { DiscoveryService } from '@nestjs/core';
import type { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { z } from 'zod';

import { CLIENT_TOOLS } from '@/chat/client-tools';
import type { EditLockService } from '@/edit-lock/edit-lock.service';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import type { PrismaService } from '@/prisma/prisma.service';

import { AiTool, AiToolHandler, type AiToolMetadata } from '../ai-tool.decorator';
import { AiToolRegistryService, type RegisteredAiTool } from '../ai-tool-registry.service';
import type { ToolAuditService } from '../tool-audit.service';
import type { ToolContext } from '../tool-auth';
import {
   adminContext,
   adminToolOptions,
   contextWithGrants,
   mockEditLocks,
   mockToolAudit,
   mockToolPrisma,
   noPermissionContext,
   toolOptions,
} from './tool-context.fixture';

type ToolClass = new () => AiToolHandler;

type SdkTool = {
   description?: string;
   inputSchema: unknown;
   needsApproval?: unknown;
   execute?: (input: unknown, options: unknown) => Promise<unknown>;
};

const USER_DELETE = { resource: PermissionResource.users, action: PermissionAction.delete };
const TAG_READ = { resource: PermissionResource.tags, action: PermissionAction.read };
const TAG_CREATE = { resource: PermissionResource.tags, action: PermissionAction.create };

const idSchema = z.object({ id: z.number() });

const toolClass = (meta: AiToolMetadata, execute = jest.fn()): ToolClass => {
   class Handler extends AiToolHandler {
      execute = execute;
   }
   AiTool(meta)(Handler);
   return Handler;
};

const wrapperOf = (
   Class: ToolClass,
   overrides: { instance?: unknown; isStatic?: boolean; module?: string } = {},
): InstanceWrapper =>
   ({
      name: Class.name,
      metatype: Class,
      host: { name: overrides.module ?? 'TestModule' },
      instance: 'instance' in overrides ? overrides.instance : new Class(),
      isDependencyTreeStatic: () => overrides.isStatic ?? true,
   }) as unknown as InstanceWrapper;

const fakeDiscovery = (wrappers: InstanceWrapper[]): DiscoveryService =>
   ({
      getProviders: jest.fn().mockReturnValue(wrappers),
      getMetadataByDecorator: (decorator: { KEY: string }, wrapper: InstanceWrapper) =>
         Reflect.getMetadata(decorator.KEY, wrapper.metatype as object),
   }) as unknown as DiscoveryService;

const bootstrap = (wrappers: InstanceWrapper[], audit = mockToolAudit()) => {
   const registry = new AiToolRegistryService(
      fakeDiscovery(wrappers),
      audit as unknown as ToolAuditService,
      mockToolPrisma() as unknown as PrismaService,
      mockEditLocks() as unknown as EditLockService,
   );
   registry.onApplicationBootstrap();
   return registry;
};

const deleteUserMeta: AiToolMetadata = {
   name: 'deleteUser',
   description: 'Delete a user.',
   inputSchema: idSchema,
   permission: USER_DELETE,
   behavior: 'destructive',
   audit: { action: 'user.delete', resourceType: 'user' },
};

const listTagsMeta: AiToolMetadata = {
   name: 'listTags',
   description: 'List tags.',
   inputSchema: z.object({}),
   permission: TAG_READ,
   behavior: 'readonly',
};

const createTagMeta: AiToolMetadata = {
   name: 'createTag',
   description: 'Create a tag.',
   inputSchema: z.object({ name: z.string() }),
   permission: TAG_CREATE,
   audit: { action: 'tag.create', resourceType: 'tag' },
};

const anyIdMeta: AiToolMetadata = {
   ...createTagMeta,
   name: 'touchRecord',
   inputSchema: z.object({
      id: z.number().optional(),
      projectId: z.number().optional(),
      key: z.string().optional(),
   }),
};

describe('AiToolRegistryService — discovery', () => {
   it('registers every @AiTool provider, applying the default behavior', () => {
      const registry = bootstrap([
         wrapperOf(toolClass(deleteUserMeta)),
         wrapperOf(toolClass(listTagsMeta)),
         wrapperOf(toolClass(createTagMeta), { module: 'TagModule' }),
      ]);

      expect(registry.getRegistrySnapshot()).toEqual([
         expect.objectContaining({ meta: deleteUserMeta, behavior: 'destructive' }),
         expect.objectContaining({ meta: listTagsMeta, behavior: 'readonly' }),
         expect.objectContaining({ meta: createTagMeta, behavior: 'mutating' }),
      ]);
      expect(registry.getRegistrySnapshot()[2].source).toBe('TagModule/Handler');
   });

   it('skips providers whose metadata is missing', () => {
      class Plain extends AiToolHandler {
         execute = jest.fn();
      }

      expect(bootstrap([wrapperOf(Plain)]).getRegistrySnapshot()).toEqual([]);
   });

   it('rejects a duplicate tool name and names both sources', () => {
      expect(() =>
         bootstrap([
            wrapperOf(toolClass(deleteUserMeta), { module: 'UserModule' }),
            wrapperOf(toolClass(deleteUserMeta), { module: 'OtherModule' }),
         ]),
      ).toThrow(
         /Duplicate AI tool name "deleteUser" from UserModule\/Handler and OtherModule\/Handler/,
      );
   });

   it('rejects a request-scoped (non-static) provider', () => {
      expect(() => bootstrap([wrapperOf(toolClass(deleteUserMeta), { isStatic: false })])).toThrow(
         /must be a static \(singleton\) provider/,
      );
   });

   it('rejects a provider that does not extend AiToolHandler (even with an execute property)', () => {
      expect(() =>
         bootstrap([wrapperOf(toolClass(deleteUserMeta), { instance: { execute: jest.fn() } })]),
      ).toThrow(/"deleteUser" \(TestModule\/Handler\) must extend AiToolHandler/);
   });

   it.each<[string, Partial<AiToolMetadata>, RegExp]>([
      ['a non-camelCase name', { name: 'delete_user' }, /invalid name/],
      ['a name starting with a capital', { name: 'DeleteUser' }, /invalid name/],
      [
         'a name that collides with a client tool',
         { name: 'navigateTo' },
         /collides with a client tool/,
      ],
      ['an empty description', { description: '' }, /must declare a description/],
      [
         'an unknown permission resource',
         {
            permission: {
               resource: 'wallets' as PermissionResource,
               action: PermissionAction.read,
            },
         },
         /unknown permission resource "wallets"/,
      ],
      [
         'an unknown permission action',
         { permission: { resource: PermissionResource.users, action: 'nuke' as PermissionAction } },
         /unknown permission action "nuke"/,
      ],
      [
         'an unknown behavior',
         { behavior: 'sideways' as 'readonly' },
         /unknown behavior "sideways"/,
      ],
   ])('rejects %s', (_label, overrides, message) => {
      expect(() => bootstrap([wrapperOf(toolClass({ ...createTagMeta, ...overrides }))])).toThrow(
         message,
      );
   });

   it('rejects a readonly tool whose permission is not READ', () => {
      expect(() =>
         bootstrap([wrapperOf(toolClass({ ...listTagsMeta, permission: TAG_CREATE }))]),
      ).toThrow(/is readonly but requires permission action "create"/);
   });

   it('rejects a destructive tool whose permission is neither DELETE nor UPDATE', () => {
      expect(() =>
         bootstrap([wrapperOf(toolClass({ ...deleteUserMeta, permission: TAG_CREATE }))]),
      ).toThrow(/is destructive but requires permission action "create"/);
   });

   it('rejects a destructive tool that needs no real grant', () => {
      expect(() =>
         bootstrap([wrapperOf(toolClass({ ...deleteUserMeta, permission: 'authenticated' }))]),
      ).toThrow(/is destructive and needs a real permission grant/);
   });

   describe("permission 'admin' and 'authenticated' (routes without @RequirePermission)", () => {
      const run = async (permission: 'admin' | 'authenticated', ctx: ToolContext) => {
         const execute = jest.fn().mockResolvedValue({ ok: true });
         const registry = bootstrap([
            wrapperOf(toolClass({ ...listTagsMeta, name: 'selfTool', permission }, execute)),
         ]);
         const tool = registry.getToolSet().selfTool as unknown as SdkTool;
         const result = tool.execute?.({}, toolOptions(ctx));
         return { execute, result };
      };

      it('admin: a role without isAdmin is rejected like AdminGuard, even with every grant', async () => {
         const grants = Object.values(PermissionResource).map((resource) => ({
            resource,
            action: PermissionAction.read,
         }));
         const { execute, result } = await run('admin', contextWithGrants(grants));

         await expect(result).rejects.toThrow('Insufficient permissions: admin role required');
         expect(execute).not.toHaveBeenCalled();
      });

      it('admin: an admin role passes', async () => {
         const { result } = await run('admin', adminContext());

         await expect(result).resolves.toEqual({ ok: true });
      });

      it('authenticated: an actor without any grant passes', async () => {
         const { result } = await run('authenticated', noPermissionContext());

         await expect(result).resolves.toEqual({ ok: true });
      });
   });

   it('rejects a DELETE-permission tool that is not destructive (no delete without approval)', () => {
      expect(() =>
         bootstrap([wrapperOf(toolClass({ ...deleteUserMeta, behavior: 'mutating' }))]),
      ).toThrow(/requires permission action "delete" but is not destructive/);
   });

   it('rejects a mutating tool without audit metadata', () => {
      expect(() =>
         bootstrap([wrapperOf(toolClass({ ...createTagMeta, audit: undefined }))]),
      ).toThrow(/is mutating and must declare audit/);
   });

   it.each([
      [
         'a readonly tool',
         { ...listTagsMeta, needsApproval: true as const },
         /is readonly and must not declare needsApproval/,
      ],
      [
         'a destructive tool',
         { ...deleteUserMeta, needsApproval: true as const },
         /is destructive and must not declare needsApproval/,
      ],
      [
         'a value that is neither true nor a function',
         { ...createTagMeta, needsApproval: false as never },
         /neither true nor a function/,
      ],
   ])('rejects needsApproval on %s', (_label, meta, message) => {
      expect(() => bootstrap([wrapperOf(toolClass(meta))])).toThrow(message);
   });

   const projectTarget = { entity: 'project', idField: 'id' } as const;

   it.each([
      ['a readonly tool', { ...listTagsMeta, publishedTarget: projectTarget }],
      ['a destructive tool', { ...deleteUserMeta, publishedTarget: projectTarget }],
      [
         'a tool that declares needsApproval too',
         { ...createTagMeta, needsApproval: true as const, publishedTarget: projectTarget },
      ],
   ])('rejects publishedTarget on %s', (_label, meta) => {
      expect(() => bootstrap([wrapperOf(toolClass(meta as AiToolMetadata))])).toThrow(
         /may declare publishedTarget only as a mutating tool without needsApproval/,
      );
   });

   it.each([
      ['a field the input does not have', { entity: 'project', idField: 'projectId' }],
      ['a field that is not a number', { entity: 'project', idField: 'name' }],
   ])('rejects a publishedTarget whose idField is %s', (_label, publishedTarget) => {
      const meta = { ...createTagMeta, publishedTarget } as unknown as AiToolMetadata;

      expect(() => bootstrap([wrapperOf(toolClass(meta))])).toThrow(
         /publishedTarget.idField "\w+" that is not a numeric field of its inputSchema/,
      );
   });

   it('accepts a publishedTarget on a numeric field of the input', () => {
      const meta: AiToolMetadata = {
         ...createTagMeta,
         inputSchema: z.object({ id: z.number().int().positive(), name: z.string() }),
         publishedTarget: { entity: 'project', idField: 'id' } as never,
      };

      expect(() => bootstrap([wrapperOf(toolClass(meta))])).not.toThrow();
   });

   it('rejects a publishedTarget of another entity', () => {
      const meta = {
         ...createTagMeta,
         publishedTarget: { entity: 'tag', idField: 'id' },
      } as unknown as AiToolMetadata;

      expect(() => bootstrap([wrapperOf(toolClass(meta))])).toThrow(
         /declares an invalid publishedTarget/,
      );
   });

   it('rejects a readonly tool that declares audit metadata', () => {
      expect(() =>
         bootstrap([
            wrapperOf(
               toolClass({ ...listTagsMeta, audit: { action: 'tag.list', resourceType: 'tag' } }),
            ),
         ]),
      ).toThrow(/is readonly and must not declare audit/);
   });
});

describe('AiToolRegistryService.getActiveToolNames', () => {
   const adminOnlyMeta: AiToolMetadata = {
      ...listTagsMeta,
      name: 'getAiUsage',
      permission: 'admin',
   };
   const ownProfileMeta: AiToolMetadata = {
      ...createTagMeta,
      name: 'updateMyName',
      permission: 'authenticated',
   };
   const registry = () =>
      bootstrap([
         wrapperOf(toolClass(deleteUserMeta)),
         wrapperOf(toolClass(listTagsMeta)),
         wrapperOf(toolClass(createTagMeta)),
         wrapperOf(toolClass(adminOnlyMeta)),
         wrapperOf(toolClass(ownProfileMeta)),
      ]);
   const serverTools = (names: string[]) =>
      names.filter((name) => !Object.keys(CLIENT_TOOLS).includes(name)).sort();

   it('offers a role only the server tools it holds the grant for, and every client tool', () => {
      const names = registry().getActiveToolNames(contextWithGrants([TAG_READ]));

      expect(serverTools(names)).toEqual(['listTags', 'updateMyName']);
      expect(names).toEqual(expect.arrayContaining(Object.keys(CLIENT_TOOLS)));
   });

   it('offers a role without grants only what any signed-in user may call', () => {
      expect(serverTools(registry().getActiveToolNames(noPermissionContext()))).toEqual([
         'updateMyName',
      ]);
   });

   it('offers an admin role every tool, the admin-only ones included', () => {
      expect(serverTools(registry().getActiveToolNames(adminContext()))).toEqual(
         ['createTag', 'deleteUser', 'getAiUsage', 'listTags', 'updateMyName'].sort(),
      );
   });
});

describe('AiToolRegistryService.getToolSet', () => {
   it('exposes the server tools by their metadata name next to the client tools', () => {
      const registry = bootstrap([
         wrapperOf(toolClass(deleteUserMeta)),
         wrapperOf(toolClass(listTagsMeta)),
      ]);

      const toolSet = registry.getToolSet();

      expect(Object.keys(toolSet).sort()).toEqual(
         [
            'deleteUser',
            'listTags',
            'navigateTo',
            'openEntity',
            'setChatMode',
            'switchLanguage',
         ].sort(),
      );
      const deleteUser = toolSet.deleteUser as SdkTool;
      expect(deleteUser.description).toBe(deleteUserMeta.description);
      expect(deleteUser.inputSchema).toBe(idSchema);
      expect(typeof deleteUser.execute).toBe('function');
      expect((toolSet.navigateTo as SdkTool).execute).toBeUndefined();
   });

   it('is empty (client tools only) before bootstrap', () => {
      const registry = new AiToolRegistryService(
         fakeDiscovery([]),
         mockToolAudit() as unknown as ToolAuditService,
         mockToolPrisma() as unknown as PrismaService,
         mockEditLocks() as unknown as EditLockService,
      );

      expect(Object.keys(registry.getToolSet()).sort()).toEqual([
         'navigateTo',
         'openEntity',
         'setChatMode',
         'switchLanguage',
      ]);
   });
});

describe('AiToolRegistryService.buildSdkTool — admission, audit, approval', () => {
   let audit: ReturnType<typeof mockToolAudit>;
   let execute: jest.Mock;

   const registered = (meta: AiToolMetadata): RegisteredAiTool => ({
      meta,
      behavior: meta.behavior ?? 'mutating',
      handler: new (toolClass(meta, execute))(),
      source: 'TestModule/Handler',
   });

   const build = (meta: AiToolMetadata) =>
      AiToolRegistryService.buildSdkTool(
         registered(meta),
         audit as unknown as ToolAuditService,
         mockToolPrisma() as unknown as PrismaService,
      ) as SdkTool;

   const run = (meta: AiToolMetadata, input: unknown, options: unknown) =>
      (build(meta).execute as NonNullable<SdkTool['execute']>)(input, options);

   const normalised = (ctx: ToolContext) => ({ ...ctx, ipAddress: null, userAgent: null });

   beforeEach(() => {
      audit = mockToolAudit();
      execute = jest.fn().mockResolvedValue({ id: 3, deleted: true });
   });

   it('stops a tool before it runs when the account was deactivated meanwhile, and audits it', async () => {
      const prisma = mockToolPrisma(false);
      const ctx = adminContext();
      const sdkTool = AiToolRegistryService.buildSdkTool(
         registered(deleteUserMeta),
         audit as unknown as ToolAuditService,
         prisma as unknown as PrismaService,
      ) as SdkTool;

      await expect(
         (sdkTool.execute as NonNullable<SdkTool['execute']>)({ id: 3 }, toolOptions(ctx)),
      ).rejects.toThrow('Your account is no longer active');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
         where: { id: ctx.user.id, deletedAt: null, deactivatedAt: null },
         select: { id: true, role: { select: { isAdmin: true, permissions: true } } },
      });
      expect(execute).not.toHaveBeenCalled();
      expect(audit.logToolFailure).toHaveBeenCalledWith(
         normalised(ctx),
         expect.objectContaining({
            toolName: 'deleteUser',
            error: expect.objectContaining({ name: 'ToolActorInactiveError' }),
         }),
      );
   });

   it('admits a call against the role stored now, not the one of the request snapshot', async () => {
      const prisma = mockToolPrisma(true);
      const ctx = adminContext();
      const sdkTool = AiToolRegistryService.buildSdkTool(
         registered(deleteUserMeta),
         audit as unknown as ToolAuditService,
         prisma as unknown as PrismaService,
      ) as SdkTool;
      const call = () =>
         (sdkTool.execute as NonNullable<SdkTool['execute']>)({ id: 3 }, toolOptions(ctx));

      await expect(call()).resolves.toEqual({ id: 3, deleted: true });
      prisma.user.findFirst.mockResolvedValue({
         id: ctx.user.id,
         role: { isAdmin: false, permissions: [] },
      });
      await expect(call()).rejects.toThrow('Insufficient permissions: users.delete');

      expect(execute).toHaveBeenCalledTimes(1);
      expect(audit.logToolFailure).toHaveBeenCalledWith(
         expect.objectContaining({ user: expect.objectContaining({ id: ctx.user.id }) }),
         expect.objectContaining({
            error: expect.objectContaining({ name: 'ToolPermissionError' }),
         }),
      );
   });

   it('grants a call the role stored now holds although the request snapshot lacks it', async () => {
      const prisma = mockToolPrisma(true);
      prisma.user.findFirst.mockResolvedValue({
         id: 2,
         role: { isAdmin: true, permissions: [] },
      });
      const sdkTool = AiToolRegistryService.buildSdkTool(
         registered(deleteUserMeta),
         audit as unknown as ToolAuditService,
         prisma as unknown as PrismaService,
      ) as SdkTool;

      await expect(
         (sdkTool.execute as NonNullable<SdkTool['execute']>)(
            { id: 3 },
            toolOptions(noPermissionContext()),
         ),
      ).resolves.toEqual({ id: 3, deleted: true });
   });

   it('refuses the next tool call of a stream after the account was deactivated between the calls', async () => {
      const prisma = mockToolPrisma(true);
      const sdkTool = AiToolRegistryService.buildSdkTool(
         registered(deleteUserMeta),
         audit as unknown as ToolAuditService,
         prisma as unknown as PrismaService,
      ) as SdkTool;
      const call = () =>
         (sdkTool.execute as NonNullable<SdkTool['execute']>)(
            { id: 3 },
            toolOptions(adminContext()),
         );

      await expect(call()).resolves.toEqual({ id: 3, deleted: true });
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(call()).rejects.toThrow('no longer active');

      expect(execute).toHaveBeenCalledTimes(1);
   });

   it('rejects a caller without the grant before the handler runs, and audits the denial', async () => {
      const ctx = noPermissionContext();

      await expect(run(deleteUserMeta, { id: 3 }, toolOptions(ctx))).rejects.toThrow(
         'Insufficient permissions: users.delete',
      );

      expect(execute).not.toHaveBeenCalled();
      expect(audit.logToolSuccess).not.toHaveBeenCalled();
      expect(audit.logToolFailure).toHaveBeenCalledWith(normalised(ctx), {
         toolName: 'deleteUser',
         input: { id: 3 },
         error: expect.objectContaining({ name: 'ToolPermissionError' }),
      });
   });

   it('rejects a call without an actor context before the handler runs', async () => {
      await expect(run(deleteUserMeta, { id: 3 }, undefined)).rejects.toThrow(
         /without an authenticated actor/,
      );

      expect(execute).not.toHaveBeenCalled();
      expect(audit.logToolFailure).not.toHaveBeenCalled();
   });

   it('runs the handler with the normalised context and audits the success', async () => {
      const ctx = contextWithGrants([USER_DELETE]);

      await expect(run(deleteUserMeta, { id: 3 }, toolOptions(ctx))).resolves.toEqual({
         id: 3,
         deleted: true,
      });

      expect(execute).toHaveBeenCalledWith(normalised(ctx), { id: 3 });
      expect(audit.logToolSuccess).toHaveBeenCalledWith(normalised(ctx), {
         action: 'user.delete',
         resourceType: 'user',
         resourceId: 3,
      });
      expect(audit.logToolFailure).not.toHaveBeenCalled();
   });

   it('lets an admin through without explicit grants', async () => {
      await run(deleteUserMeta, { id: 3 }, adminToolOptions());

      expect(execute).toHaveBeenCalledWith(normalised(adminContext()), { id: 3 });
   });

   it.each([
      ['the output id', { id: 7 }, { id: 42, name: 'x' }, 42],
      ['the input id when the output has none', { id: 7 }, { created: true }, 7],
      ['null when neither carries an id', { projectId: 7 }, { ok: true }, null],
      ['a string id', { key: 'k' }, { id: 'feature.flag' }, 'feature.flag'],
   ])('derives resourceId from %s', async (_label, input, output, resourceId) => {
      execute.mockResolvedValue(output);

      await run(anyIdMeta, input, adminToolOptions());

      expect(audit.logToolSuccess).toHaveBeenCalledWith(
         expect.anything(),
         expect.objectContaining({ resourceId }),
      );
   });

   it('derives the action and the resource type from the input when the tool declares them so', async () => {
      const purgeMeta: AiToolMetadata = {
         ...anyIdMeta,
         name: 'purgeRecord',
         inputSchema: z.object({ type: z.string(), id: z.number() }),
         audit: {
            action: (input) => `${(input as { type: string }).type}.deletePermanently`,
            resourceType: (input) => (input as { type: string }).type,
         },
      };
      execute.mockResolvedValue({ purged: true });

      await run(purgeMeta, { type: 'file', id: 5 }, adminToolOptions());

      expect(audit.logToolSuccess).toHaveBeenCalledWith(expect.anything(), {
         action: 'file.deletePermanently',
         resourceType: 'file',
         resourceId: 5,
      });
   });

   it('does not audit a successful readonly call', async () => {
      execute.mockResolvedValue({ total: 0, items: [] });

      await run(listTagsMeta, {}, adminToolOptions());

      expect(audit.logToolSuccess).not.toHaveBeenCalled();
      expect(audit.logToolFailure).not.toHaveBeenCalled();
   });

   it('rejects an input that fails the schema before the handler runs, and audits it', async () => {
      const forged = { id: '3; DROP TABLE users' };

      await expect(run(deleteUserMeta, forged, adminToolOptions())).rejects.toThrow(
         /^Invalid input for tool "deleteUser": .*\n?.*expected number/s,
      );

      expect(execute).not.toHaveBeenCalled();
      expect(audit.logToolSuccess).not.toHaveBeenCalled();
      expect(audit.logToolFailure).toHaveBeenCalledWith(normalised(adminContext()), {
         toolName: 'deleteUser',
         input: forged,
         error: expect.objectContaining({ name: 'ToolInputError' }),
      });
   });

   it('checks the permission before the schema (a denied caller learns nothing about it)', async () => {
      await expect(
         run(deleteUserMeta, { id: 'x' }, toolOptions(noPermissionContext())),
      ).rejects.toThrow('Insufficient permissions: users.delete');
   });

   it('hands the handler the parsed input (unknown keys stripped, transforms applied)', async () => {
      const meta: AiToolMetadata = {
         ...createTagMeta,
         inputSchema: z.object({ name: z.string().trim() }),
      };

      await run(meta, { name: '  React ', injected: true }, adminToolOptions());

      expect(execute).toHaveBeenCalledWith(normalised(adminContext()), { name: 'React' });
   });

   it('removes the e-mail of an embedded user from the output for a caller without users.read', async () => {
      const author = { id: 9, firstName: 'Jan', lastName: 'Novák', email: 'jan@example.com' };
      execute.mockResolvedValue({ id: 1, createdBy: author });
      const ctx = contextWithGrants([TAG_READ]);

      await expect(run(listTagsMeta, {}, toolOptions(ctx))).resolves.toEqual({
         id: 1,
         createdBy: { id: 9, firstName: 'Jan', lastName: 'Novák' },
      });
      await expect(run(listTagsMeta, {}, adminToolOptions())).resolves.toEqual({
         id: 1,
         createdBy: author,
      });
   });

   it('audits a handler failure and rethrows it untouched', async () => {
      const boom = new Error('User with id 9 not found');
      execute.mockRejectedValue(boom);

      await expect(run(deleteUserMeta, { id: 9 }, adminToolOptions())).rejects.toBe(boom);

      expect(audit.logToolSuccess).not.toHaveBeenCalled();
      expect(audit.logToolFailure).toHaveBeenCalledWith(normalised(adminContext()), {
         toolName: 'deleteUser',
         input: { id: 9 },
         error: boom,
      });
   });

   it('gates a destructive tool with approvalUnlessDenied (HITL contract)', () => {
      const needsApproval = build(deleteUserMeta).needsApproval as (
         input: unknown,
         options: unknown,
      ) => boolean;

      expect(typeof needsApproval).toBe('function');
      expect(needsApproval({}, adminToolOptions())).toBe(true);
      expect(needsApproval({}, toolOptions(contextWithGrants([USER_DELETE])))).toBe(true);
      expect(needsApproval({}, toolOptions(noPermissionContext()))).toBe(false);
      expect(needsApproval({}, undefined)).toBe(true);
   });

   it.each([
      ['mutating', createTagMeta],
      ['readonly', listTagsMeta],
   ])('does not ask for approval on a %s tool', (_label, meta) => {
      expect(build(meta).needsApproval).toBeUndefined();
   });

   type ApprovalGate = (input: unknown, options: unknown) => boolean;

   it('gates a mutating tool that declares needsApproval: true like a destructive one', () => {
      const needsApproval = build({ ...createTagMeta, needsApproval: true })
         .needsApproval as ApprovalGate;

      expect(needsApproval({}, adminToolOptions())).toBe(true);
      expect(needsApproval({}, toolOptions(contextWithGrants([TAG_CREATE])))).toBe(true);
      expect(needsApproval({}, toolOptions(noPermissionContext()))).toBe(false);
      expect(needsApproval({}, undefined)).toBe(true);
   });

   describe('editTarget (edit lock of the record)', () => {
      type AsyncGate = (input: unknown, options: unknown) => Promise<boolean>;
      const TAG_UPDATE = { resource: PermissionResource.tags, action: PermissionAction.update };
      const updateTagMeta: AiToolMetadata = {
         ...createTagMeta,
         name: 'updateTag',
         permission: TAG_UPDATE,
         editTarget: (input) => [{ entity: EditLockEntity.tags, id: (input as { id: number }).id }],
      };
      const buildGate = (meta: AiToolMetadata, editLocks?: { isHeldByOther: jest.Mock }) =>
         AiToolRegistryService.buildSdkTool(
            registered(meta),
            audit as unknown as ToolAuditService,
            mockToolPrisma() as unknown as PrismaService,
            undefined,
            undefined,
            undefined,
            editLocks,
         ).needsApproval as AsyncGate;

      it('asks for approval when another user holds the lock, asks the lock of the caller', async () => {
         const isHeldByOther = jest.fn().mockResolvedValue(true);
         const gate = buildGate(updateTagMeta, { isHeldByOther });

         await expect(gate({ id: 7 }, adminToolOptions())).resolves.toBe(true);
         expect(isHeldByOther).toHaveBeenCalledWith([{ entity: EditLockEntity.tags, id: 7 }], 1);

         isHeldByOther.mockResolvedValue(false);
         await expect(gate({ id: 7 }, adminToolOptions())).resolves.toBe(false);
      });

      it('fails closed: a failing lock read, a throwing editTarget or no lock store ask', async () => {
         const failing = jest.fn().mockRejectedValue(new Error('redis down'));
         await expect(
            buildGate(updateTagMeta, { isHeldByOther: failing })({ id: 7 }, adminToolOptions()),
         ).resolves.toBe(true);
         await expect(
            buildGate(
               {
                  ...updateTagMeta,
                  editTarget: () => {
                     throw new Error('bad input');
                  },
               },
               { isHeldByOther: jest.fn().mockResolvedValue(false) },
            )({ id: 7 }, adminToolOptions()),
         ).resolves.toBe(true);
         await expect(buildGate(updateTagMeta)({ id: 7 }, adminToolOptions())).resolves.toBe(true);
         await expect(
            buildGate(updateTagMeta, { isHeldByOther: jest.fn().mockResolvedValue(false) })(
               { id: 7 },
               undefined,
            ),
         ).resolves.toBe(true);
      });

      it('skips the lock read for a caller who is rejected anyway and for no targets', async () => {
         const isHeldByOther = jest.fn().mockResolvedValue(true);

         await expect(
            buildGate(updateTagMeta, { isHeldByOther })(
               { id: 7 },
               toolOptions(noPermissionContext()),
            ),
         ).resolves.toBe(false);
         expect(isHeldByOther).not.toHaveBeenCalled();

         await expect(
            buildGate({ ...updateTagMeta, editTarget: () => [] }, { isHeldByOther })(
               { id: 7 },
               adminToolOptions(),
            ),
         ).resolves.toBe(false);
         expect(isHeldByOther).not.toHaveBeenCalled();
      });

      it('keeps the approval a tool declares with needsApproval: true', async () => {
         const gate = buildGate(
            { ...updateTagMeta, needsApproval: true },
            { isHeldByOther: jest.fn().mockResolvedValue(false) },
         );

         await expect(gate({ id: 7 }, adminToolOptions())).resolves.toBe(true);
         await expect(gate({ id: 7 }, toolOptions(noPermissionContext()))).resolves.toBe(false);
      });

      it.each([
         [
            'a readonly tool',
            { ...listTagsMeta, editTarget: () => [] },
            /is readonly and must not declare editTarget/,
         ],
         [
            'a destructive tool',
            { ...deleteUserMeta, editTarget: () => [] },
            /is destructive and must not declare editTarget/,
         ],
         [
            'a value that is not a function',
            { ...updateTagMeta, editTarget: true as never },
            /editTarget that is not a function/,
         ],
      ])('rejects editTarget on %s', (_label, meta, message) => {
         expect(() => bootstrap([wrapperOf(toolClass(meta))])).toThrow(message);
      });
   });

   it('asks only for the inputs the needsApproval function selects', () => {
      const needsApproval = build({
         ...createTagMeta,
         needsApproval: (input) => (input as { color?: string }).color !== undefined,
      }).needsApproval as ApprovalGate;

      expect(needsApproval({ color: '#000' }, adminToolOptions())).toBe(true);
      expect(needsApproval({ name: 'React' }, adminToolOptions())).toBe(false);
      expect(needsApproval({ color: '#000' }, toolOptions(noPermissionContext()))).toBe(false);
   });

   it('asks for approval when the needsApproval function throws (fail closed)', () => {
      const needsApproval = build({
         ...createTagMeta,
         needsApproval: () => {
            throw new Error('bug');
         },
      }).needsApproval as ApprovalGate;

      expect(needsApproval({}, adminToolOptions())).toBe(true);
   });
});

describe('AiToolRegistryService — review follow-ups', () => {
   let audit: ReturnType<typeof mockToolAudit>;

   beforeEach(() => {
      audit = mockToolAudit();
   });

   afterEach(() => {
      jest.restoreAllMocks();
   });

   const sdkExecute = (meta: AiToolMetadata, execute: jest.Mock) =>
      AiToolRegistryService.buildSdkTool(
         {
            meta,
            behavior: meta.behavior ?? 'mutating',
            handler: new (toolClass(meta, execute))(),
            source: 'TestModule/Handler',
         },
         audit as unknown as ToolAuditService,
         mockToolPrisma() as unknown as PrismaService,
      ).execute as (input: unknown, options: unknown) => Promise<unknown>;

   it('uses audit.resourceIdFrom over the id fallback when declared', async () => {
      const meta: AiToolMetadata = {
         ...createTagMeta,
         name: 'addProjectMedia',
         inputSchema: z.object({ projectId: z.number(), fileId: z.number() }),
         audit: {
            action: 'project.addMedia',
            resourceType: 'project',
            resourceIdFrom: (input) => (input as { projectId: number }).projectId,
         },
      };
      const execute = jest.fn().mockResolvedValue({ id: 99, mediaId: 5 });

      await sdkExecute(meta, execute)({ projectId: 7, fileId: 3 }, adminToolOptions());

      expect(audit.logToolSuccess).toHaveBeenCalledWith(
         expect.anything(),
         expect.objectContaining({ resourceId: 7 }),
      );
   });

   it.each([
      [
         'the audit write rejects',
         () => audit.logToolSuccess.mockRejectedValueOnce(new Error('db')),
      ],
      [
         'building the audit row throws',
         () => {
            audit.logToolSuccess.mockImplementationOnce(() => {
               throw new Error('unserialisable');
            });
         },
      ],
   ])('returns the output and logs once when %s after the tool ran', async (_name, arrange) => {
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      error.mockClear();
      arrange();
      const execute = jest.fn().mockResolvedValue({ id: 8 });

      await expect(
         sdkExecute(createTagMeta, execute)({ name: 'x' }, adminToolOptions()),
      ).resolves.toEqual({
         id: 8,
      });

      expect(execute).toHaveBeenCalledTimes(1);
      expect(audit.logToolFailure).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith(
         expect.stringContaining('"createTag"'),
         expect.any(String),
      );
   });

   it('rethrows the original tool error when writing the failure audit row throws', async () => {
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      audit.logToolFailure.mockImplementationOnce(() => {
         throw new Error('audit exploded');
      });
      const original = new Error('handler failed');
      const execute = jest.fn().mockRejectedValue(original);

      await expect(
         sdkExecute(createTagMeta, execute)({ name: 'x' }, adminToolOptions()),
      ).rejects.toBe(original);

      expect(error).toHaveBeenCalledWith(
         expect.stringContaining('"createTag"'),
         expect.any(String),
      );
   });

   it('warns with the tool name when the actor context is missing and writes no audit row', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
      warn.mockClear();
      const execute = jest.fn();

      await expect(sdkExecute(deleteUserMeta, execute)({ id: 1 }, undefined)).rejects.toThrow(
         /without an authenticated actor/,
      );

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"deleteUser"'));
      expect(execute).not.toHaveBeenCalled();
      expect(audit.logToolFailure).not.toHaveBeenCalled();
   });

   it('rejects at bootstrap an AiToolHandler subclass instance without execute()', () => {
      const Class = toolClass(deleteUserMeta);
      const instance = Object.create(Class.prototype) as object;

      expect(() => bootstrap([wrapperOf(Class, { instance })])).toThrow(
         /"deleteUser" \(TestModule\/Handler\) must implement execute\(\)/,
      );
   });
});
