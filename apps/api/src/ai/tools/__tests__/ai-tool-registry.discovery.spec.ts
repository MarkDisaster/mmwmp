import { Injectable, Module, Scope } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { z } from 'zod';

import { EditLockService } from '@/edit-lock/edit-lock.service';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma/prisma.service';
import { TagService } from '@/tag/tag.service';
import { ListTagsTool } from '@/tag/tools/list-tags.tool';

import { AiTool, AiToolHandler } from '../ai-tool.decorator';
import { AiToolRegistryService } from '../ai-tool-registry.service';
import { ToolAuditService } from '../tool-audit.service';
import type { ToolContext } from '../tool-auth';
import { mockEditLocks, mockToolAudit, mockToolPrisma } from './tool-context.fixture';

describe('AiToolRegistryService — real Nest discovery', () => {
   const boot = async (providers: unknown[]) => {
      @Module({
         imports: [DiscoveryModule],
         providers: [
            AiToolRegistryService,
            { provide: ToolAuditService, useValue: mockToolAudit() },
            { provide: PrismaService, useValue: mockToolPrisma() },
            { provide: EditLockService, useValue: mockEditLocks() },
            ...(providers as never[]),
         ],
      })
      class TestModule {}

      const app = await Test.createTestingModule({ imports: [TestModule] }).compile();
      await app.init();
      return app;
   };

   it('discovers a decorated provider from another module and exposes it in the tool set', async () => {
      @Module({
         providers: [ListTagsTool, { provide: TagService, useValue: {} }],
      })
      class TagTestModule {}

      @Module({
         imports: [DiscoveryModule, TagTestModule],
         providers: [
            AiToolRegistryService,
            { provide: ToolAuditService, useValue: mockToolAudit() },
            { provide: PrismaService, useValue: mockToolPrisma() },
            { provide: EditLockService, useValue: mockEditLocks() },
         ],
      })
      class RegistryTestModule {}

      const app = await Test.createTestingModule({ imports: [RegistryTestModule] }).compile();
      await app.init();

      const registry = app.get(AiToolRegistryService);
      expect(registry.getRegistrySnapshot().map(({ meta, source }) => [meta.name, source])).toEqual(
         [['listTags', 'TagTestModule/ListTagsTool']],
      );
      expect(Object.keys(registry.getToolSet())).toEqual(
         expect.arrayContaining(['listTags', 'navigateTo', 'setChatMode', 'switchLanguage']),
      );

      await app.close();
   });

   it('refuses to boot with a request-scoped tool', async () => {
      @AiTool({
         name: 'scopedTool',
         description: 'Request-scoped by mistake.',
         inputSchema: z.object({}),
         permission: { resource: PermissionResource.tags, action: PermissionAction.read },
         behavior: 'readonly',
      })
      @Injectable({ scope: Scope.REQUEST })
      class ScopedTool extends AiToolHandler<Record<string, never>> {
         async execute(_ctx: ToolContext) {
            return null;
         }
      }

      await expect(boot([ScopedTool])).rejects.toThrow(
         /"scopedTool" \(TestModule\/ScopedTool\) must be a static \(singleton\) provider/,
      );
   });
});
