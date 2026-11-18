import { z } from 'zod';

import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { AiTool, AiToolHandler, type AiToolMetadata } from '../ai-tool.decorator';
import type { ToolContext } from '../tool-auth';

const inputSchema = z.object({ id: z.number() });
type Input = z.infer<typeof inputSchema>;

const meta: AiToolMetadata<typeof inputSchema> = {
   name: 'deleteThing',
   description: 'Delete a thing.',
   inputSchema,
   permission: { resource: PermissionResource.tags, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: { action: 'thing.delete', resourceType: 'thing' },
};

describe('@AiTool', () => {
   it('stores the metadata under AiTool.KEY on the class', () => {
      @AiTool(meta)
      class DeleteThingTool extends AiToolHandler<Input> {
         async execute(_ctx: ToolContext, { id }: Input) {
            return { id };
         }
      }

      expect(Reflect.getMetadata(AiTool.KEY, DeleteThingTool)).toBe(meta);
   });

   it('rejects a class whose execute input does not match the schema', () => {
      // @ts-expect-error — `execute` input is `{ slug: string }`, schema infers `{ id: number }`.
      @AiTool(meta)
      class WrongInputTool extends AiToolHandler<{ slug: string }> {
         async execute(_ctx: ToolContext, { slug }: { slug: string }) {
            return { slug };
         }
      }

      expect(WrongInputTool).toBeDefined();
   });

   it('rejects a class that does not extend AiToolHandler', () => {
      // @ts-expect-error — structural look-alike without the AiToolHandler brand.
      @AiTool(meta)
      class LookAlikeTool {
         async execute(_ctx: ToolContext, { id }: Input) {
            return { id };
         }
      }

      expect(LookAlikeTool).toBeDefined();
   });

   it('rejects metadata without a permission', () => {
      const { permission: _permission, ...withoutPermission } = meta;

      // @ts-expect-error — `permission` is mandatory.
      @AiTool(withoutPermission)
      class NoPermissionTool extends AiToolHandler<Input> {
         async execute(_ctx: ToolContext, { id }: Input) {
            return { id };
         }
      }

      expect(NoPermissionTool).toBeDefined();
   });
});
