import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { ConfigService } from '@nestjs/config';
import type { DiscoveryService } from '@nestjs/core';
import type { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { streamText } from 'ai';
import ts from 'typescript';
import { z } from 'zod';

import type { AiInteractionService } from '@/ai/observability/ai-interaction.service';
import type { PromptRegistryService } from '@/ai/prompts/prompt-registry.service';
import {
   adminToolOptions,
   mockEditLocks,
   mockToolAudit,
   mockToolPrisma,
   noPermissionContext,
   toolOptions,
} from '@/ai/tools/__tests__/tool-context.fixture';
import {
   type DiscoveredTool,
   discoverToolsOnDisk,
   SRC_DIR,
   type ToolClass,
} from '@/ai/tools/__tests__/tools-on-disk.fixture';
import { AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { AiToolRegistryService } from '@/ai/tools/ai-tool-registry.service';
import { ALT_TEXT_BATCH_MAX } from '@/ai/tools/limits';
import type { ToolAuditService } from '@/ai/tools/tool-audit.service';
import { CLIENT_TOOLS } from '@/chat/client-tools';
import type { EditLockService } from '@/edit-lock/edit-lock.service';
import type { PrismaService } from '@/prisma/prisma.service';

import { ChatService } from '../chat.service';

jest.mock('ai', () => ({
   ...jest.requireActual('ai'),
   streamText: jest.fn(() => ({})),
   convertToModelMessages: jest.fn(async () => []),
}));
jest.mock('@ai-sdk/google', () => ({ google: jest.fn(() => ({ modelId: 'google-stub' })) }));
jest.mock('@ai-sdk/anthropic', () => ({
   anthropic: jest.fn(() => ({ modelId: 'anthropic-stub' })),
}));

const ADMIN_INVALIDATIONS = path.resolve(
   SRC_DIR,
   '../../admin/src/features/ai-chat/utils/writeToolCacheInvalidation.ts',
);

const TOOLS_ON_DISK = discoverToolsOnDisk();

const explodingDependency = () =>
   new Proxy(
      {},
      {
         get: (_target, prop) => {
            throw new Error(`dependency touched: ${String(prop)}`);
         },
      },
   );

const instantiate = (Class: ToolClass) =>
   new Class(explodingDependency() as never, explodingDependency() as never);

const wrappedExecute = ({ Class, meta }: DiscoveredTool) => {
   const sdkTool = AiToolRegistryService.buildSdkTool(
      {
         meta,
         behavior: meta.behavior ?? 'mutating',
         handler: instantiate(Class),
         source: Class.name,
      },
      mockToolAudit() as unknown as ToolAuditService,
      mockToolPrisma() as unknown as PrismaService,
   );
   return sdkTool.execute as (input: unknown, options: unknown) => Promise<unknown>;
};

const CASES: ReadonlyArray<[string, DiscoveredTool]> = TOOLS_ON_DISK.map((t) => [t.meta.name, t]);

describe('AI tool RBAC — every server tool enforces the caller permissions', () => {
   it('every tool class extends AiToolHandler', () => {
      for (const { Class, file } of TOOLS_ON_DISK) {
         expect({ file, isHandler: Class.prototype instanceof AiToolHandler }).toEqual({
            file,
            isHandler: true,
         });
      }
   });

   it.each(CASES.filter(([, t]) => typeof t.meta.permission !== 'string'))(
      '%s rejects a role with no grants before touching anything',
      async (_n, t) => {
         await expect(wrappedExecute(t)({}, toolOptions(noPermissionContext()))).rejects.toThrow(
            /^Insufficient permissions: [a-z_]+\.[a-z]+$/,
         );
      },
   );

   it.each(CASES.filter(([, t]) => t.meta.permission === 'admin'))(
      '%s rejects a caller whose role is not an admin role (AdminGuard)',
      async (_n, t) => {
         await expect(wrappedExecute(t)({}, toolOptions(noPermissionContext()))).rejects.toThrow(
            /^Insufficient permissions: admin role required$/,
         );
      },
   );

   it.each(CASES.filter(([, t]) => t.meta.permission === 'authenticated'))(
      '%s needs no grant, only a signed-in actor',
      async (_n, t) => {
         await expect(wrappedExecute(t)({}, toolOptions(noPermissionContext()))).rejects.toThrow(
            new RegExp(`dependency touched|^Invalid input for tool "${t.meta.name}"`),
         );
      },
   );

   it.each(CASES)('%s rejects a call without an actor context', async (_n, t) => {
      await expect(wrappedExecute(t)({}, undefined)).rejects.toThrow(
         /without an authenticated actor/,
      );
   });

   it.each(CASES)('%s lets an admin past the permission check', async (_n, t) => {
      await expect(wrappedExecute(t)({}, adminToolOptions())).rejects.toThrow(
         new RegExp(`dependency touched|^Invalid input for tool "${t.meta.name}"`),
      );
   });

   it.each(CASES)('%s rejects a forged input before touching anything', async (_n, t) => {
      await expect(wrappedExecute(t)('forged', adminToolOptions())).rejects.toThrow(
         new RegExp(`^Invalid input for tool "${t.meta.name}"`),
      );
   });
});

describe('ChatService.streamAgent', () => {
   type StreamTextOptions = {
      experimental_context: unknown;
      experimental_toolApprovalSecret?: unknown;
      experimental_onToolCallFinish?: unknown;
      tools: unknown;
   };

   let toolSet: Record<string, unknown>;
   let service: ChatService;
   const getActiveToolNames = jest.fn(() => ['listTags']);

   beforeEach(() => {
      jest.mocked(streamText).mockClear();
      const config = { get: jest.fn().mockReturnValue('google') };
      const prompts = { has: jest.fn().mockReturnValue(true), render: jest.fn(() => 'persona') };
      const interactions = { record: jest.fn().mockResolvedValue(undefined) };
      toolSet = { listTags: {} };
      const registry = { getToolSet: jest.fn(() => toolSet), getActiveToolNames };

      service = new ChatService(
         config as unknown as ConfigService,
         prompts as unknown as PromptRegistryService,
         interactions as unknown as AiInteractionService,
         registry as unknown as AiToolRegistryService,
      );
   });

   const lastStreamTextOptions = () =>
      jest.mocked(streamText).mock.calls.at(-1)?.[0] as unknown as StreamTextOptions;

   it('forwards the actor context to the SDK as experimental_context', async () => {
      const context = noPermissionContext();

      await service.streamAgent([], context);

      expect(lastStreamTextOptions().experimental_context).toBe(context);
   });

   it('hands the SDK exactly the registry tool set, read per request', async () => {
      await service.streamAgent([], noPermissionContext());
      expect(lastStreamTextOptions().tools).toBe(toolSet);

      toolSet = { listUsers: {} };
      await service.streamAgent([], noPermissionContext());
      expect(lastStreamTextOptions().tools).toBe(toolSet);
   });

   it('signs tool approvals with a key of the user and conversation derived from AI_TOOL_APPROVAL_SECRET', async () => {
      const withSecret = (value: string | undefined) =>
         new ChatService(
            {
               get: jest.fn((key: string) =>
                  key === 'AI_TOOL_APPROVAL_SECRET' ? value : 'google',
               ),
            } as unknown as ConfigService,
            { has: jest.fn().mockReturnValue(true), render: jest.fn(() => 'persona') } as never,
            { record: jest.fn() } as never,
            { getToolSet: jest.fn(() => toolSet), getActiveToolNames } as never,
         );
      const keyFor = async (secret: string | undefined, userId: number, conversationId: string) => {
         const context = { ...noPermissionContext(), conversationId };
         await withSecret(secret).streamAgent([], {
            ...context,
            user: { ...context.user, id: userId },
         });
         return lastStreamTextOptions().experimental_toolApprovalSecret;
      };
      const secret = 'a'.repeat(32);

      const key = await keyFor(secret, 1, 'conv-1');

      expect(key).toEqual(expect.any(String));
      expect(key).not.toBe(secret);
      expect(await keyFor(secret, 1, 'conv-1')).toBe(key);
      expect(await keyFor(secret, 2, 'conv-1')).not.toBe(key);
      expect(await keyFor(secret, 1, 'conv-2')).not.toBe(key);
      expect(await keyFor('b'.repeat(32), 1, 'conv-1')).not.toBe(key);
      expect(await keyFor(undefined, 1, 'conv-1')).toBeUndefined();
      expect(await keyFor('', 1, 'conv-1')).toBeUndefined();
   });

   it('leaves failure auditing to the registry wrapper (no onToolCallFinish hook)', async () => {
      await service.streamAgent([], noPermissionContext());

      expect(lastStreamTextOptions().experimental_onToolCallFinish).toBeUndefined();
   });
});

const BULK_TOOLS_BY_OUTPUT: ReadonlySet<string> = new Set([
   'updateFiles',
   'deleteFiles',
   'updateProjectsStatus',
   'addTagToProjects',
   'removeTagFromProjects',
]);

describe('AI tool catalog — stable names and behaviors', () => {
   const EXPECTED_TOOLS: Record<string, 'readonly' | 'mutating' | 'destructive'> = {
      getContact: 'readonly',
      updateContact: 'mutating',
      listFiles: 'readonly',
      getFile: 'readonly',
      updateFile: 'mutating',
      updateFiles: 'mutating',
      findUnusedFiles: 'readonly',
      viewFileImage: 'readonly',
      deleteFiles: 'destructive',
      deleteFile: 'destructive',
      restoreFile: 'destructive',
      listProjects: 'readonly',
      findProjects: 'readonly',
      getProject: 'readonly',
      updateProjectStatus: 'mutating',
      updateProject: 'mutating',
      deleteProject: 'destructive',
      restoreProject: 'destructive',
      assignProjectTags: 'mutating',
      addProjectTag: 'mutating',
      removeProjectTag: 'mutating',
      addProjectMedia: 'mutating',
      removeProjectMedia: 'mutating',
      sortProjectMedia: 'mutating',
      setProjectLinks: 'mutating',
      moveProject: 'mutating',
      setProjectThumbnail: 'mutating',
      upsertProjectTranslation: 'mutating',
      deleteProjectTranslation: 'destructive',
      createProject: 'mutating',
      updateProjectsStatus: 'mutating',
      addTagToProjects: 'mutating',
      removeTagFromProjects: 'mutating',
      sortProjectTags: 'mutating',
      getProjectPreviewUrl: 'readonly',
      generateProjectTranslation: 'mutating',
      getGameScoreStats: 'readonly',
      listGameScores: 'readonly',
      findSuspiciousGameScores: 'readonly',
      setRunnerScoreVisibility: 'mutating',
      deleteRunnerScore: 'destructive',
      listRoles: 'readonly',
      findRoles: 'readonly',
      getRole: 'readonly',
      createRole: 'mutating',
      updateRole: 'mutating',
      deleteRole: 'destructive',
      setRolePermissions: 'mutating',
      grantRolePermission: 'mutating',
      revokeRolePermission: 'mutating',
      listServices: 'readonly',
      findServices: 'readonly',
      getService: 'readonly',
      updateServiceStatus: 'mutating',
      updateService: 'mutating',
      deleteService: 'destructive',
      restoreService: 'destructive',
      assignServiceProjects: 'mutating',
      addServiceProject: 'mutating',
      removeServiceProject: 'mutating',
      moveService: 'mutating',
      upsertServiceTranslation: 'mutating',
      deleteServiceTranslation: 'destructive',
      createService: 'mutating',
      getServicePreviewUrl: 'readonly',
      generateServiceTranslation: 'mutating',
      listTags: 'readonly',
      findTags: 'readonly',
      getTag: 'readonly',
      createTag: 'mutating',
      updateTag: 'mutating',
      moveTag: 'mutating',
      deleteTag: 'destructive',
      restoreTag: 'destructive',
      revalidateWebsite: 'mutating',
      listSlugRedirects: 'readonly',
      deleteSlugRedirect: 'mutating',
      listTrash: 'readonly',
      purgeTrash: 'destructive',
      listUsers: 'readonly',
      findUsers: 'readonly',
      inviteUser: 'mutating',
      resendUserInvitation: 'mutating',
      updateUser: 'mutating',
      deactivateUser: 'mutating',
      reactivateUser: 'mutating',
      deleteUser: 'destructive',
      getMyProfile: 'readonly',
      updateMyName: 'mutating',
      checkLinks: 'readonly',
      auditContent: 'readonly',
      getContentStats: 'readonly',
      listAuditLogs: 'readonly',
      getAiUsageStats: 'readonly',
   };

   const onDisk = Object.fromEntries(
      TOOLS_ON_DISK.map(({ meta }) => [meta.name, meta.behavior ?? 'mutating']),
   );

   it('every tool on disk has exactly the expected name and behavior', () => {
      expect(onDisk).toEqual(EXPECTED_TOOLS);
   });

   it('keeps 94 server tools, 15 of them destructive', () => {
      expect(Object.keys(EXPECTED_TOOLS)).toHaveLength(94);
      expect(Object.values(EXPECTED_TOOLS).filter((b) => b === 'destructive')).toHaveLength(15);
   });

   it('has an admin chat cache invalidation for every tool that writes, and only for those', () => {
      const source = ts.createSourceFile(
         ADMIN_INVALIDATIONS,
         readFileSync(ADMIN_INVALIDATIONS, 'utf8'),
         ts.ScriptTarget.Latest,
      );
      const map = source.statements
         .filter(ts.isVariableStatement)
         .flatMap((statement) => statement.declarationList.declarations)
         .find((d) => ts.isIdentifier(d.name) && d.name.text === 'WRITE_TOOL_INVALIDATIONS');
      if (!map?.initializer || !ts.isObjectLiteralExpression(map.initializer)) {
         throw new Error('WRITE_TOOL_INVALIDATIONS must be an object literal');
      }
      const adminEntries = map.initializer.properties.map((property) => {
         if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
            throw new Error('WRITE_TOOL_INVALIDATIONS must list each tool as `name: [...]`');
         }
         return property.name.text;
      });

      const writeTools = Object.keys(onDisk).filter((name) => onDisk[name] !== 'readonly');
      expect(adminEntries.sort()).toEqual(writeTools.sort());
   });

   it('keeps the audit resourceId source of the tools whose id is not `id`', () => {
      const RESOURCE_ID_FROM: Record<string, 'projectId' | 'serviceId' | 'tagId' | 'roleId'> = {
         addProjectMedia: 'projectId',
         addProjectTag: 'projectId',
         removeProjectTag: 'projectId',
         addServiceProject: 'serviceId',
         removeServiceProject: 'serviceId',
         grantRolePermission: 'roleId',
         revokeRolePermission: 'roleId',
         removeProjectMedia: 'projectId',
         sortProjectMedia: 'projectId',
         sortProjectTags: 'projectId',
         generateProjectTranslation: 'projectId',
         generateServiceTranslation: 'serviceId',
         setProjectLinks: 'projectId',
         moveProject: 'projectId',
         moveTag: 'tagId',
         upsertProjectTranslation: 'projectId',
         deleteProjectTranslation: 'projectId',
         moveService: 'serviceId',
         upsertServiceTranslation: 'serviceId',
         deleteServiceTranslation: 'serviceId',
      };
      const sample = { projectId: 7, serviceId: 8, tagId: 9, roleId: 10 };

      const resolved = Object.fromEntries(
         TOOLS_ON_DISK.filter(
            ({ meta }) => meta.audit?.resourceIdFrom && !BULK_TOOLS_BY_OUTPUT.has(meta.name),
         ).map(({ meta }) => [meta.name, meta.audit?.resourceIdFrom?.(sample, {})]),
      );

      expect(resolved).toEqual(
         Object.fromEntries(
            Object.entries(RESOURCE_ID_FROM).map(([name, key]) => [name, sample[key]]),
         ),
      );
   });

   it('names each tool after its file (delete-user.tool.ts ↔ deleteUser)', () => {
      const toToolName = (file: string) =>
         path
            .basename(file, '.tool.ts')
            .split('-')
            .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
            .join('');

      for (const { file, meta } of TOOLS_ON_DISK) {
         expect({ file, name: meta.name }).toEqual({ file, name: toToolName(file) });
      }
   });

   it('passes bootstrap validation for all 94 real tools and exposes them next to the client tools', () => {
      const wrappers = TOOLS_ON_DISK.map(
         ({ Class }) =>
            ({
               name: Class.name,
               metatype: Class,
               host: { name: 'TestModule' },
               instance: instantiate(Class),
               isDependencyTreeStatic: () => true,
            }) as unknown as InstanceWrapper,
      );
      const discovery = {
         getProviders: () => wrappers,
         getMetadataByDecorator: (decorator: { KEY: string }, wrapper: InstanceWrapper) =>
            Reflect.getMetadata(decorator.KEY, wrapper.metatype as object),
      } as unknown as DiscoveryService;
      const registry = new AiToolRegistryService(
         discovery,
         mockToolAudit() as unknown as ToolAuditService,
         mockToolPrisma() as unknown as PrismaService,
         mockEditLocks() as unknown as EditLockService,
      );

      expect(() => registry.onApplicationBootstrap()).not.toThrow();
      expect(registry.getRegistrySnapshot()).toHaveLength(94);
      expect(Object.keys(registry.getToolSet()).sort()).toEqual(
         [...Object.keys(EXPECTED_TOOLS), ...Object.keys(CLIENT_TOOLS)].sort(),
      );
   });
});

describe('AI tool catalog — which calls wait for the approval tile', () => {
   const EXPECTED_APPROVAL: Record<string, 'always' | 'byInput' | 'whenPublished'> = {
      deleteFile: 'always',
      deleteRunnerScore: 'always',
      setRunnerScoreVisibility: 'always',
      deleteFiles: 'always',
      restoreFile: 'always',
      restoreProject: 'always',
      restoreService: 'always',
      restoreTag: 'always',
      purgeTrash: 'always',
      deleteProject: 'always',
      deleteSlugRedirect: 'always',
      deleteProjectTranslation: 'always',
      deleteRole: 'always',
      deleteService: 'always',
      deleteServiceTranslation: 'always',
      deleteTag: 'always',
      deleteUser: 'always',
      inviteUser: 'always',
      resendUserInvitation: 'always',
      grantRolePermission: 'always',
      revokeRolePermission: 'always',
      setRolePermissions: 'always',
      deactivateUser: 'always',
      reactivateUser: 'always',
      updateUser: 'byInput',
      updateFiles: 'always',
      updateProjectsStatus: 'always',
      addTagToProjects: 'always',
      removeTagFromProjects: 'always',
      createTag: 'always',
      updateTag: 'always',
      moveTag: 'always',
      updateContact: 'always',
      updateFile: 'always',
      addProjectMedia: 'whenPublished',
      addProjectTag: 'whenPublished',
      assignProjectTags: 'whenPublished',
      moveProject: 'whenPublished',
      removeProjectMedia: 'whenPublished',
      removeProjectTag: 'whenPublished',
      setProjectLinks: 'whenPublished',
      setProjectThumbnail: 'whenPublished',
      sortProjectMedia: 'whenPublished',
      sortProjectTags: 'whenPublished',
      updateProject: 'whenPublished',
      upsertProjectTranslation: 'whenPublished',
      addServiceProject: 'whenPublished',
      assignServiceProjects: 'whenPublished',
      moveService: 'whenPublished',
      removeServiceProject: 'whenPublished',
      updateService: 'whenPublished',
      upsertServiceTranslation: 'whenPublished',
      updateProjectStatus: 'always',
      updateServiceStatus: 'always',
      createProject: 'byInput',
      createService: 'byInput',
      revalidateWebsite: 'always',
      generateProjectTranslation: 'always',
      generateServiceTranslation: 'always',
   };

   const gateOf = ({ Class, meta }: DiscoveredTool) =>
      AiToolRegistryService.approvalGate(
         {
            meta,
            behavior: meta.behavior ?? 'mutating',
            handler: instantiate(Class),
            source: Class.name,
         },
         mockToolPrisma() as unknown as PrismaService,
      );

   it('gates exactly the expected tools', () => {
      const gated = Object.fromEntries(
         TOOLS_ON_DISK.flatMap((t) => {
            const gate = gateOf(t);
            if (!gate) return [];
            if (t.meta.publishedTarget) return [[t.meta.name, 'whenPublished']];
            return [[t.meta.name, gate({}) === true ? 'always' : 'byInput']];
         }),
      );

      expect(gated).toEqual(EXPECTED_APPROVAL);
   });

   it('asks for updateUser only when the e-mail or the role changes', () => {
      const updateUser = TOOLS_ON_DISK.find(({ meta }) => meta.name === 'updateUser');
      if (!updateUser) throw new Error('updateUser tool not found');
      const gate = gateOf(updateUser);

      expect(gate?.({ id: 1, firstName: 'Jana', lastName: 'Nová' })).toBe(false);
      expect(gate?.({ id: 1, email: 'jana@example.com' })).toBe(true);
      expect(gate?.({ id: 1, roleId: 2 })).toBe(true);
   });
});

describe('AURORA prompt — tool references match the registry', () => {
   const PROMPT = readFileSync(path.resolve(SRC_DIR, 'ai/prompts/aurora-admin.md'), 'utf8');
   const KNOWN_TOOLS = new Set([
      ...TOOLS_ON_DISK.map(({ meta }) => meta.name),
      ...Object.keys(CLIENT_TOOLS),
   ]);

   it('lists every tool in the catalog tables, and only real tools', () => {
      const catalog = [...PROMPT.matchAll(/^\| `([a-z][A-Za-z0-9]*)` +\|/gm)].map(
         ([, name]) => name,
      );

      expect([...new Set(catalog)].sort()).toEqual([...KNOWN_TOOLS].sort());
   });

   const TOOL_LIKE =
      /^(list|get|find|create|update|delete|assign|set|add|remove|sort|move|upsert|invite|resend|grant|revoke|navigate|switch|open|audit|check|view|revalidate)[A-Z][A-Za-z0-9]*$/;
   const inputVocabulary = (node: unknown): string[] => {
      if (Array.isArray(node)) return node.flatMap(inputVocabulary);
      if (typeof node !== 'object' || node === null) return typeof node === 'string' ? [node] : [];
      const { properties, enum: values, ...rest } = node as Record<string, unknown>;
      return [
         ...(properties && typeof properties === 'object' ? Object.keys(properties) : []),
         ...inputVocabulary(properties),
         ...(Array.isArray(values) ? values.filter((v): v is string => typeof v === 'string') : []),
         ...inputVocabulary(Object.values(rest).filter((v) => typeof v === 'object')),
      ];
   };
   const ALLOWED = new Set([
      ...KNOWN_TOOLS,
      ...TOOLS_ON_DISK.flatMap(({ meta }) => inputVocabulary(z.toJSONSchema(meta.inputSchema))),
   ]);
   const unknownToolNames = (text: string) =>
      [...new Set([...text.matchAll(/`([a-z][A-Za-z0-9]*)(?:\(|`)/g)].map(([, name]) => name))]
         .filter((name) => TOOL_LIKE.test(name))
         .filter((name) => !ALLOWED.has(name));

   it('states the alt text batch size the code uses (ALT_TEXT_BATCH_MAX)', () => {
      expect(PROMPT).toContain(`nejvýše ${ALT_TEXT_BATCH_MAX} souborů`);
   });

   it('mentions no tool that does not exist', () => {
      expect(unknownToolNames(PROMPT)).toEqual([]);
   });

   it('only navigates to routes the navigateTo schema accepts', () => {
      const schema = CLIENT_TOOLS.navigateTo.inputSchema as z.ZodType;
      const paths = [...PROMPT.matchAll(/navigateTo\(\{ path: '([^']*)' \}\)/g)].map(([, p]) => p);

      expect(paths.length).toBeGreaterThan(0);
      expect(paths.filter((p) => !schema.safeParse({ path: p }).success)).toEqual([]);
   });

   it('names no tool in the tool descriptions that does not exist', () => {
      const unknown = TOOLS_ON_DISK.flatMap(({ meta }) =>
         unknownToolNames(meta.description).map((name) => `${meta.name} → ${name}`),
      );
      expect(unknown).toEqual([]);
   });
});
