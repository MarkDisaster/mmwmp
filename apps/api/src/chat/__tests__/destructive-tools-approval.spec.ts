import {
   adminToolOptions,
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
import type { PrismaService } from '@/prisma/prisma.service';

type NeedsApproval = (input: unknown, options: unknown) => boolean;

describe('HITL — destructive tools require approval', () => {
   const destructiveTools: ReadonlyArray<[string, DiscoveredTool]> = discoverToolsOnDisk()
      .filter(({ meta }) => meta.behavior === 'destructive')
      .map((tool) => [tool.meta.name, tool]);

   const needsApprovalOf = ({ Class, meta }: DiscoveredTool): NeedsApproval => {
      const sdkTool = AiToolRegistryService.buildSdkTool(
         {
            meta,
            behavior: meta.behavior ?? 'mutating',
            handler: new Class({} as never),
            source: Class.name,
         },
         mockToolAudit() as unknown as ToolAuditService,
         mockToolPrisma() as unknown as PrismaService,
      );
      expect(typeof sdkTool.needsApproval).toBe('function');
      return sdkTool.needsApproval as NeedsApproval;
   };

   it('finds the destructive tools on disk', () => {
      expect(destructiveTools.length).toBeGreaterThan(0);
   });

   it.each(destructiveTools)('%s asks for approval when the caller may act', (_name, tool) => {
      expect(needsApprovalOf(tool)({}, adminToolOptions())).toBe(true);
   });

   it.each(destructiveTools)(
      '%s skips the prompt when the caller provably lacks the permission',
      (_name, tool) => {
         expect(needsApprovalOf(tool)({}, toolOptions(noPermissionContext()))).toBe(false);
      },
   );

   it.each(destructiveTools)('%s keeps the prompt when the context is missing', (_name, tool) => {
      expect(needsApprovalOf(tool)({}, undefined)).toBe(true);
   });
});
