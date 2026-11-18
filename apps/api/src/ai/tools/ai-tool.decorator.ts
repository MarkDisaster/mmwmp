import { type DiscoverableDecorator, DiscoveryService } from '@nestjs/core';
import type { Tool } from 'ai';
import type { z } from 'zod';

import type { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import type { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { ModelOutputBudget } from './model-output-budget';
import type { ToolContext } from './tool-auth';

export type AiToolBehavior = 'readonly' | 'mutating' | 'destructive';

type AiToolAudit<I = unknown> = {
   action: string | ((input: I) => string);
   resourceType: string | ((input: I) => string);
   resourceIdFrom?(input: I, output: unknown): string | number | null;
};

type AiToolPermission =
   | { resource: PermissionResource; action: PermissionAction }
   | 'authenticated'
   | 'admin';

export type AiToolPublishedTarget<I = unknown> = {
   entity: 'project' | 'service';
   idField: Extract<keyof I, string>;
};

type AiToolEditTarget = { entity: EditLockEntity; id: number };

export type AiToolMetadata<S extends z.ZodType = z.ZodType> = {
   name: string;
   description: string;
   inputSchema: S;
   permission: AiToolPermission;
   behavior?: AiToolBehavior;
   needsApproval?: true | ((input: z.infer<S>) => boolean);
   publishedTarget?: AiToolPublishedTarget<z.infer<S>>;
   editTarget?: (input: z.infer<S>) => AiToolEditTarget[];
   audit?: AiToolAudit<z.infer<S>>;
};

export abstract class AiToolHandler<I = unknown, O = unknown> {
   protected readonly isAiToolHandler = true;

   abstract execute(ctx: ToolContext, input: I): Promise<O>;

   toModelOutput?(
      ctx: ToolContext | null,
      output: O,
      budget: ModelOutputBudget,
   ): Promise<ToolModelOutput>;
}

export type ToolModelOutput = Awaited<ReturnType<NonNullable<Tool['toModelOutput']>>>;

type AiToolClass<I> = new (...args: never[]) => AiToolHandler<I>;

type TypedAiToolDecorator = <S extends z.ZodType>(
   meta: AiToolMetadata<S>,
) => <C extends AiToolClass<z.infer<S>>>(target: C) => void;

export const AiTool = DiscoveryService.createDecorator<AiToolMetadata>() as TypedAiToolDecorator &
   DiscoverableDecorator<AiToolMetadata>;
