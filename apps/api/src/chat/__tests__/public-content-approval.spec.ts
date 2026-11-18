import type { z } from 'zod';

import {
   adminContext,
   adminToolOptions,
   contextWithGrants,
   mockToolAudit,
   mockToolPrisma,
   noPermissionContext,
   toolOptions,
} from '@/ai/tools/__tests__/tool-context.fixture';
import {
   type DiscoveredTool,
   discoverToolsOnDisk,
} from '@/ai/tools/__tests__/tools-on-disk.fixture';
import { AiToolRegistryService } from '@/ai/tools/ai-tool-registry.service';
import type { ToolAuditService } from '@/ai/tools/tool-audit.service';
import type { EditLockService } from '@/edit-lock/edit-lock.service';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import type { PermissionResource } from '@/generated/prisma/enums';
import type { PrismaService } from '@/prisma/prisma.service';

type NeedsApproval = (input: unknown, options: unknown) => boolean | Promise<boolean>;

const REACHES_PUBLIC_WEB: Record<PermissionResource, boolean> = {
   projects: true,
   services: true,
   tags: true,
   files: true,
   contact: true,
   runner_scores: true,
   users: false,
   roles: false,
   audit_logs: false,
};

const LIVE_INPUT: Record<string, unknown> = {
   createProject: { status: 'published' },
   createService: { status: 'published' },
};

const NOT_PUBLIC_WRITES: ReadonlySet<string> = new Set([
   'createRole',
   'updateRole',
   'updateMyName',
]);

const TOOLS = discoverToolsOnDisk();

type EditLocks = Pick<EditLockService, 'isHeldByOther'>;

const needsApprovalOf = (
   { Class, meta }: DiscoveredTool,
   prisma = mockToolPrisma(),
   editLocks: EditLocks = { isHeldByOther: () => Promise.resolve(false) },
): NeedsApproval | undefined =>
   AiToolRegistryService.buildSdkTool(
      { meta, behavior: meta.behavior ?? 'mutating', handler: new Class({} as never), source: '' },
      mockToolAudit() as unknown as ToolAuditService,
      prisma as unknown as PrismaService,
      undefined,
      undefined,
      undefined,
      editLocks,
   ).needsApproval as NeedsApproval | undefined;

const liveInputOf = ({ meta }: DiscoveredTool): unknown => {
   if (meta.publishedTarget) return { [meta.publishedTarget.idField]: 1 };
   if (typeof meta.needsApproval === 'function') return LIVE_INPUT[meta.name];
   return {};
};

describe('HITL — every AI write that reaches the public web requires approval', () => {
   const publicWrites: ReadonlyArray<[string, DiscoveredTool]> = TOOLS.filter(
      ({ meta }) =>
         meta.behavior !== 'readonly' &&
         typeof meta.permission !== 'string' &&
         REACHES_PUBLIC_WEB[meta.permission.resource],
   ).map((tool) => [tool.meta.name, tool]);

   it('finds the writes on disk', () => {
      expect(publicWrites.length).toBeGreaterThan(40);
   });

   it('leaves only the listed writes without approval', () => {
      const ungated = TOOLS.filter(
         (tool) => tool.meta.behavior !== 'readonly' && needsApprovalOf(tool) === undefined,
      ).map(({ meta }) => meta.name);

      expect(ungated.sort()).toEqual([...NOT_PUBLIC_WRITES].sort());
   });

   it('lists no write on a resource that reaches the web as not public', () => {
      const listed = TOOLS.filter(({ meta }) => NOT_PUBLIC_WRITES.has(meta.name));

      expect(listed).toHaveLength(NOT_PUBLIC_WRITES.size);
      for (const { meta } of listed) {
         expect(meta.behavior).not.toBe('readonly');
         if (typeof meta.permission !== 'string') {
            expect({ [meta.name]: REACHES_PUBLIC_WEB[meta.permission.resource] }).toEqual({
               [meta.name]: false,
            });
         }
      }
   });

   it.each(publicWrites)(
      '%s asks for approval of a call that changes the web',
      async (_n, tool) => {
         const needsApproval = needsApprovalOf(tool);
         const input = liveInputOf(tool);

         expect(typeof needsApproval).toBe('function');
         expect(input).toBeDefined();
         await expect(Promise.resolve(needsApproval?.(input, adminToolOptions()))).resolves.toBe(
            true,
         );
      },
   );
});

describe('publishedTarget — the approval follows the status of the edited row', () => {
   const targeted: ReadonlyArray<[string, DiscoveredTool]> = TOOLS.filter(
      ({ meta }) => meta.publishedTarget,
   ).map((tool) => [tool.meta.name, tool]);

   const prismaWith = (row: unknown) => {
      const prisma = mockToolPrisma();
      prisma.project.findFirst.mockResolvedValue(row);
      prisma.service.findFirst.mockResolvedValue(row);
      return prisma;
   };

   it('covers every tool that edits one project or service', () => {
      expect(targeted.map(([name]) => name).sort()).toEqual(
         [
            'addProjectMedia',
            'addProjectTag',
            'addServiceProject',
            'assignProjectTags',
            'assignServiceProjects',
            'moveProject',
            'moveService',
            'removeProjectMedia',
            'removeProjectTag',
            'removeServiceProject',
            'setProjectLinks',
            'setProjectThumbnail',
            'sortProjectMedia',
            'sortProjectTags',
            'updateProject',
            'updateService',
            'upsertProjectTranslation',
            'upsertServiceTranslation',
         ].sort(),
      );
   });

   it.each(targeted)('%s names a numeric id field of its input', (_n, { meta }) => {
      const shape = (meta.inputSchema as z.ZodObject).shape;
      const field = meta.publishedTarget?.idField ?? '';

      expect(shape[field]?.safeParse(1).success).toBe(true);
   });

   it.each(targeted)(
      '%s edits a draft without the tile, reading its own table',
      async (_n, tool) => {
         const prisma = prismaWith({ status: 'draft' });
         const target = tool.meta.publishedTarget;
         if (!target) throw new Error('no publishedTarget');

         const answer = await needsApprovalOf(tool, prisma)?.(
            { [target.idField]: 7 },
            adminToolOptions(),
         );

         expect(answer).toBe(false);
         const read = target.entity === 'project' ? prisma.project : prisma.service;
         const other = target.entity === 'project' ? prisma.service : prisma.project;
         expect(read.findFirst).toHaveBeenCalledWith({
            where: { id: 7, deletedAt: null },
            select: { status: true },
         });
         expect(other.findFirst).not.toHaveBeenCalled();
      },
   );

   const toolNamed = (name: string) => {
      const found = TOOLS.find(({ meta }) => meta.name === name);
      if (!found) throw new Error(`${name} tool not found`);
      return found;
   };
   const updateProject = toolNamed('updateProject');
   const UPDATE_TOOLS = [
      ['updateProject', 'projects'],
      ['updateService', 'services'],
   ] as const;

   it.each(UPDATE_TOOLS)('%s asks for a published row', async (name) => {
      const prisma = prismaWith({ status: 'published' });

      await expect(
         needsApprovalOf(toolNamed(name), prisma)?.({ id: 7 }, adminToolOptions()),
      ).resolves.toBe(true);
   });

   it.each(UPDATE_TOOLS)(
      '%s asks a role with update and publish, not one with update only (the domain refuses it)',
      async (name, resource) => {
         const prisma = prismaWith({ status: 'published' });
         const needsApproval = needsApprovalOf(toolNamed(name), prisma);
         const update = { resource, action: 'update' } as const;
         const publish = { resource, action: 'publish' } as const;

         await expect(
            Promise.resolve(needsApproval?.({ id: 7 }, toolOptions(contextWithGrants([update])))),
         ).resolves.toBe(false);
         expect(prisma.project.findFirst).not.toHaveBeenCalled();
         expect(prisma.service.findFirst).not.toHaveBeenCalled();
         await expect(
            Promise.resolve(
               needsApproval?.({ id: 7 }, toolOptions(contextWithGrants([update, publish]))),
            ),
         ).resolves.toBe(true);
      },
   );

   it.each([
      ['there is no live row', () => prismaWith(null)],
      [
         'the read fails',
         () => {
            const prisma = mockToolPrisma();
            prisma.project.findFirst.mockRejectedValue(new Error('connection lost'));
            return prisma;
         },
      ],
   ])('asks when %s', async (_label, prisma) => {
      await expect(
         needsApprovalOf(updateProject, prisma())?.({ id: 7 }, adminToolOptions()),
      ).resolves.toBe(true);
   });

   it('asks without reading when the input has no numeric id', async () => {
      const prisma = prismaWith({ status: 'draft' });

      await expect(
         Promise.resolve(needsApprovalOf(updateProject, prisma)?.({ id: '7' }, adminToolOptions())),
      ).resolves.toBe(true);
      expect(prisma.project.findFirst).not.toHaveBeenCalled();
   });

   it('reads nothing for a caller who provably lacks the grant (they get the permission error)', async () => {
      const prisma = prismaWith({ status: 'published' });

      await expect(
         Promise.resolve(
            needsApprovalOf(updateProject, prisma)?.({ id: 7 }, toolOptions(noPermissionContext())),
         ),
      ).resolves.toBe(false);
      expect(prisma.project.findFirst).not.toHaveBeenCalled();
   });

   describe('with the edit lock of the row', () => {
      const ME = adminContext().user.id;
      const OTHER = ME + 1;

      const lockHeldBy = (holder?: number) => ({
         isHeldByOther: jest.fn((_targets: unknown, userId: number) =>
            Promise.resolve(holder !== undefined && holder !== userId),
         ),
      });

      const ask = async (tool: DiscoveredTool, status: string, holder?: number) => {
         const target = tool.meta.publishedTarget;
         if (!target) throw new Error('no publishedTarget');
         const locks = lockHeldBy(holder);
         const answer = await needsApprovalOf(
            tool,
            prismaWith({ status }),
            locks,
         )?.({ [target.idField]: 7 }, adminToolOptions());
         const entity =
            target.entity === 'project' ? EditLockEntity.projects : EditLockEntity.services;
         return { answer, locks, lockTarget: [{ entity, id: 7 }] };
      };

      it.each(targeted)('%s asks for a draft while another user has it open', async (_n, tool) => {
         const { answer, locks, lockTarget } = await ask(tool, 'draft', OTHER);

         expect(answer).toBe(true);
         expect(locks.isHeldByOther).toHaveBeenCalledWith(lockTarget, ME);
      });

      it.each(targeted)(
         '%s edits a draft without the tile under the own lock or no lock',
         async (_n, tool) => {
            const own = await ask(tool, 'draft', ME);
            const none = await ask(tool, 'draft');

            expect(own.answer).toBe(false);
            expect(own.locks.isHeldByOther).toHaveBeenCalledWith(own.lockTarget, ME);
            expect(none.answer).toBe(false);
         },
      );

      it.each(targeted)('%s asks for a published row under any lock', async (_n, tool) => {
         await expect(ask(tool, 'published', OTHER)).resolves.toMatchObject({ answer: true });
         await expect(ask(tool, 'published', ME)).resolves.toMatchObject({ answer: true });
      });
   });
});
