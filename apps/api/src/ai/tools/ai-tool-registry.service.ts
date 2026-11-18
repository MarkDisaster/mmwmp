import { createHash } from 'node:crypto';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { type Tool, tool, type ToolExecutionOptions, type ToolSet } from 'ai';
import { z } from 'zod';

import { CLIENT_TOOLS } from '@/chat/client-tools';
import { redactAuthorEmails } from '@/common/author/author';
import { NOT_TRASHED } from '@/common/trash/trash';
import { EditLockService } from '@/edit-lock/edit-lock.service';
import { EntityStatus, PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma/prisma.service';

import {
   AiTool,
   type AiToolBehavior,
   AiToolHandler,
   type AiToolMetadata,
   type AiToolPublishedTarget,
   type ToolModelOutput,
} from './ai-tool.decorator';
import { AsyncMemo } from './async-memo';
import { ModelOutputBudget } from './model-output-budget';
import { ToolAuditService } from './tool-audit.service';
import {
   approvalUnlessDenied,
   assertToolAdmin,
   assertToolPermission,
   getToolContext,
   hasToolPermission,
   type ToolActor,
   type ToolContext,
} from './tool-auth';

const fingerprint = (output: unknown): string => {
   try {
      return createHash('sha256')
         .update(JSON.stringify(output) ?? '')
         .digest('hex')
         .slice(0, 16);
   } catch {
      return 'unhashable';
   }
};

export type RegisteredAiTool = {
   meta: AiToolMetadata;
   behavior: AiToolBehavior;
   handler: AiToolHandler;
   source: string;
};

const TOOL_NAME_PATTERN = /^[a-z][A-Za-z0-9]{0,63}$/;
const KNOWN_RESOURCES: ReadonlySet<string> = new Set(Object.values(PermissionResource));
const KNOWN_ACTIONS: ReadonlySet<string> = new Set(Object.values(PermissionAction));
const RESERVED_TOOL_NAMES: ReadonlySet<string> = new Set(Object.keys(CLIENT_TOOLS));

class ToolInputError extends Error {
   constructor(toolName: string, details: string) {
      super(`Invalid input for tool "${toolName}": ${details}`);
      this.name = 'ToolInputError';
   }
}

export type ToolActorStore = Pick<PrismaService, 'user' | 'project' | 'service'>;

class ToolActorInactiveError extends Error {
   constructor() {
      super('Your account is no longer active, the action was not performed.');
      this.name = 'ToolActorInactiveError';
   }
}

const idOf = (value: unknown): string | number | null => {
   if (typeof value !== 'object' || value === null) return null;
   const id = (value as { id?: unknown }).id;
   return typeof id === 'string' || typeof id === 'number' ? id : null;
};

@Injectable()
export class AiToolRegistryService implements OnApplicationBootstrap {
   private static readonly logger = new Logger(AiToolRegistryService.name);
   private readonly tools = new Map<string, RegisteredAiTool>();

   constructor(
      private readonly discovery: DiscoveryService,
      private readonly toolAudit: ToolAuditService,
      private readonly prisma: PrismaService,
      private readonly editLocks: EditLockService,
   ) {}

   onApplicationBootstrap(): void {
      this.discoverTools();
   }

   getRegistrySnapshot(): RegisteredAiTool[] {
      return [...this.tools.values()];
   }

   getToolSet(context?: ToolContext): ToolSet {
      const toolSet: ToolSet = { ...CLIENT_TOOLS };
      const budget = new ModelOutputBudget();
      const memo = new AsyncMemo();
      for (const registered of this.tools.values()) {
         toolSet[registered.meta.name] = AiToolRegistryService.buildSdkTool(
            registered,
            this.toolAudit,
            this.prisma,
            context,
            budget,
            memo,
            this.editLocks,
         );
      }
      return toolSet;
   }

   getActiveToolNames(context: ToolContext): string[] {
      const permitted = [...this.tools.values()].filter(({ meta: { permission } }) => {
         if (permission === 'authenticated') return true;
         if (permission === 'admin') return context.user.role.isAdmin;
         return hasToolPermission(context, permission.resource, permission.action);
      });
      return [...Object.keys(CLIENT_TOOLS), ...permitted.map(({ meta }) => meta.name)];
   }

   static buildSdkTool(
      registered: RegisteredAiTool,
      toolAudit: ToolAuditService,
      prisma: ToolActorStore,
      context?: ToolContext,
      budget: ModelOutputBudget = new ModelOutputBudget(),
      memo: AsyncMemo = new AsyncMemo(),
      editLocks?: Pick<EditLockService, 'isHeldByOther'>,
   ): Tool<unknown, unknown> {
      const { meta, handler } = registered;
      const requiresApproval = AiToolRegistryService.approvalGate(registered, prisma);
      const unlessDenied =
         typeof meta.permission === 'string'
            ? () => true
            : approvalUnlessDenied(meta.permission.resource, meta.permission.action);

      const { editTarget } = meta;

      return tool({
         description: meta.description,
         inputSchema: meta.inputSchema,
         ...(editTarget
            ? {
                 needsApproval: async (input: unknown, options: ToolExecutionOptions) =>
                    unlessDenied(input, options) &&
                    ((requiresApproval ? await requiresApproval(input, options) : false) ||
                       (await AiToolRegistryService.isEditedByOther(
                          editTarget,
                          editLocks,
                          input,
                          options,
                       ))),
              }
            : requiresApproval
              ? {
                   needsApproval: (input: unknown, options: ToolExecutionOptions) =>
                      unlessDenied(input, options) && requiresApproval(input, options),
                }
              : {}),
         ...(handler.toModelOutput
            ? {
                 toModelOutput: ({ toolCallId, output }: { toolCallId: string; output: unknown }) =>
                    memo.run(`${meta.name}:${toolCallId}:${fingerprint(output)}`, async () => {
                       const fresh = await memo.run('actor', () =>
                          AiToolRegistryService.freshContext(prisma, context),
                       );
                       return (await handler.toModelOutput?.(
                          fresh,
                          output,
                          budget,
                       )) as ToolModelOutput;
                    }),
              }
            : {}),
         execute: (input, options) =>
            AiToolRegistryService.callRegisteredTool(registered, toolAudit, prisma, input, options),
      });
   }

   private static async isEditedByOther(
      editTarget: NonNullable<AiToolMetadata['editTarget']>,
      editLocks: Pick<EditLockService, 'isHeldByOther'> | undefined,
      input: unknown,
      options: ToolExecutionOptions,
   ): Promise<boolean> {
      try {
         if (!editLocks) return true;
         const targets = editTarget(input);
         if (targets.length === 0) return false;
         return await editLocks.isHeldByOther(targets, getToolContext(options).user.id);
      } catch {
         return true;
      }
   }

   static approvalGate(
      registered: RegisteredAiTool,
      store: ToolActorStore,
   ): ((input: unknown, options?: ToolExecutionOptions) => boolean | Promise<boolean>) | null {
      if (registered.behavior === 'destructive') return () => true;

      const { needsApproval, publishedTarget } = registered.meta;
      if (publishedTarget) {
         const unlessPublishDenied = approvalUnlessDenied(
            publishedTarget.entity === 'project'
               ? PermissionResource.projects
               : PermissionResource.services,
            PermissionAction.publish,
         );
         return (input, options) =>
            unlessPublishDenied(input, options) &&
            AiToolRegistryService.isPublishedTarget(store, publishedTarget, input);
      }
      if (needsApproval === undefined) return null;
      if (needsApproval === true) return () => true;
      return (input) => {
         try {
            return needsApproval(input);
         } catch {
            return true;
         }
      };
   }

   private static async isPublishedTarget(
      store: ToolActorStore,
      { entity, idField }: AiToolPublishedTarget,
      input: unknown,
   ): Promise<boolean> {
      const id =
         typeof input === 'object' && input !== null
            ? (input as Record<string, unknown>)[idField]
            : undefined;
      if (typeof id !== 'number') return true;
      try {
         const query = { where: { id, ...NOT_TRASHED }, select: { status: true } };
         const row =
            entity === 'project'
               ? await store.project.findFirst(query)
               : await store.service.findFirst(query);
         return row?.status !== EntityStatus.draft;
      } catch {
         return true;
      }
   }

   private static async callRegisteredTool(
      registered: RegisteredAiTool,
      toolAudit: ToolAuditService,
      prisma: ToolActorStore,
      input: unknown,
      options: ToolExecutionOptions,
   ): Promise<unknown> {
      const { meta, handler } = registered;
      let ctx: ToolContext;
      try {
         ctx = getToolContext(options);
      } catch (error) {
         AiToolRegistryService.logger.warn(
            `AI tool "${meta.name}" invoked without an actor context — rejected, not audited.`,
         );
         throw error;
      }

      let output: unknown;
      let parsedInput: unknown = input;
      try {
         ctx = { ...ctx, user: await AiToolRegistryService.loadActiveActor(prisma, ctx.user.id) };
         const fresh = { experimental_context: ctx };

         if (meta.permission === 'admin') {
            assertToolAdmin(fresh);
         } else if (meta.permission !== 'authenticated') {
            assertToolPermission(fresh, meta.permission.resource, meta.permission.action);
         }

         parsedInput = await AiToolRegistryService.parseToolInput(meta, input);

         output = await handler.execute(ctx, parsedInput);
      } catch (error) {
         try {
            await toolAudit.logToolFailure(ctx, { toolName: meta.name, input, error });
         } catch (auditError) {
            AiToolRegistryService.logger.error(
               `AI tool "${meta.name}" failed and its failure audit row could not be written.`,
               auditError instanceof Error ? auditError.stack : String(auditError),
            );
         }
         throw error;
      }

      if (meta.audit) {
         try {
            const { action, resourceType } = meta.audit;
            await toolAudit.logToolSuccess(ctx, {
               action: typeof action === 'function' ? action(parsedInput) : action,
               resourceType:
                  typeof resourceType === 'function' ? resourceType(parsedInput) : resourceType,
               resourceId: meta.audit.resourceIdFrom
                  ? meta.audit.resourceIdFrom(parsedInput, output)
                  : (idOf(output) ?? idOf(parsedInput)),
            });
         } catch (auditError) {
            AiToolRegistryService.logger.error(
               `AI tool "${meta.name}" succeeded but its audit row could not be written.`,
               auditError instanceof Error ? auditError.stack : String(auditError),
            );
         }
      }
      return redactAuthorEmails(output, ctx.user);
   }

   private static async freshContext(
      prisma: ToolActorStore,
      context: ToolContext | undefined,
   ): Promise<ToolContext | null> {
      if (!context) return null;
      try {
         return {
            ...context,
            user: await AiToolRegistryService.loadActiveActor(prisma, context.user.id),
         };
      } catch (error) {
         if (error instanceof ToolActorInactiveError) return null;
         throw error;
      }
   }

   private static async loadActiveActor(
      prisma: ToolActorStore,
      userId: number,
   ): Promise<ToolActor> {
      const user = await prisma.user.findFirst({
         where: { id: userId, deletedAt: null, deactivatedAt: null },
         select: { id: true, role: { select: { isAdmin: true, permissions: true } } },
      });
      if (!user) throw new ToolActorInactiveError();
      return {
         id: user.id,
         role: {
            isAdmin: user.role.isAdmin,
            permissions: user.role.permissions.map(({ resource, action }) => ({
               resource,
               action,
            })),
         },
      };
   }

   private static async parseToolInput(meta: AiToolMetadata, input: unknown): Promise<unknown> {
      const result = await meta.inputSchema.safeParseAsync(input);
      if (!result.success) {
         throw new ToolInputError(meta.name, z.prettifyError(result.error));
      }
      return result.data;
   }

   private discoverTools(): void {
      this.tools.clear();

      for (const wrapper of this.discovery.getProviders({ metadataKey: AiTool.KEY })) {
         const meta = this.discovery.getMetadataByDecorator(AiTool, wrapper);
         if (!meta) continue;

         const source = `${wrapper.host?.name ?? 'unknown module'}/${String(wrapper.name)}`;

         if (!wrapper.isDependencyTreeStatic()) {
            throw new Error(
               `AI tool "${meta.name}" (${source}) must be a static (singleton) provider — ` +
                  'request-scoped or transient tools are not supported.',
            );
         }

         const instance: unknown = wrapper.instance;
         if (!(instance instanceof AiToolHandler)) {
            throw new Error(`AI tool "${meta.name}" (${source}) must extend AiToolHandler.`);
         }
         if (typeof (instance as Partial<AiToolHandler>).execute !== 'function') {
            throw new Error(`AI tool "${meta.name}" (${source}) must implement execute().`);
         }

         this.registerTool(this.buildRegisteredTool(meta, instance, source));
      }

      AiToolRegistryService.logger.log(`Discovered ${this.tools.size} AI tools`);
   }

   private buildRegisteredTool(
      meta: AiToolMetadata,
      handler: AiToolHandler,
      source: string,
   ): RegisteredAiTool {
      this.assertValidToolMetadata(meta, source);
      return { meta, behavior: meta.behavior ?? 'mutating', handler, source };
   }

   private assertValidToolMetadata(meta: AiToolMetadata, source: string): void {
      const label = `AI tool "${String(meta.name)}" (${source})`;

      if (typeof meta.name !== 'string' || !TOOL_NAME_PATTERN.test(meta.name)) {
         throw new Error(`${label} has an invalid name — expected camelCase, e.g. "deleteUser".`);
      }
      if (RESERVED_TOOL_NAMES.has(meta.name)) {
         throw new Error(`${label} collides with a client tool of the same name.`);
      }
      if (typeof meta.description !== 'string' || meta.description.length === 0) {
         throw new Error(`${label} must declare a description.`);
      }
      if (!meta.inputSchema) {
         throw new Error(`${label} must declare an inputSchema.`);
      }

      const access = meta.permission;
      const roleBased = access === 'authenticated' || access === 'admin';
      let action: string | undefined;
      if (!roleBased) {
         const { resource, action: declared } = access ?? {};
         if (!KNOWN_RESOURCES.has(resource as string)) {
            throw new Error(`${label} declares unknown permission resource "${String(resource)}".`);
         }
         if (!KNOWN_ACTIONS.has(declared as string)) {
            throw new Error(`${label} declares unknown permission action "${String(declared)}".`);
         }
         action = declared;
      }

      const behavior = meta.behavior ?? 'mutating';
      if (!['readonly', 'mutating', 'destructive'].includes(behavior)) {
         throw new Error(`${label} declares unknown behavior "${String(behavior)}".`);
      }
      if (roleBased && behavior === 'destructive') {
         throw new Error(
            `${label} is destructive and needs a real permission grant, not "${access}".`,
         );
      }
      if (behavior === 'readonly' && !roleBased && action !== PermissionAction.read) {
         throw new Error(`${label} is readonly but requires permission action "${action}".`);
      }
      if (
         behavior === 'destructive' &&
         !roleBased &&
         action !== PermissionAction.delete &&
         action !== PermissionAction.update
      ) {
         throw new Error(
            `${label} is destructive but requires permission action "${action}" — ` +
               'expected "delete" or "update".',
         );
      }
      if (action === PermissionAction.delete && behavior !== 'destructive') {
         throw new Error(
            `${label} requires permission action "delete" but is not destructive — ` +
               'every delete must be gated by approval.',
         );
      }
      if (meta.needsApproval !== undefined) {
         if (behavior !== 'mutating') {
            throw new Error(
               `${label} is ${behavior} and must not declare needsApproval — ` +
                  'readonly tools need none, destructive tools always ask.',
            );
         }
         if (meta.needsApproval !== true && typeof meta.needsApproval !== 'function') {
            throw new Error(`${label} declares needsApproval that is neither true nor a function.`);
         }
      }
      if (meta.publishedTarget !== undefined) {
         if (behavior !== 'mutating' || meta.needsApproval !== undefined) {
            throw new Error(
               `${label} may declare publishedTarget only as a mutating tool without needsApproval.`,
            );
         }
         const { entity, idField } = meta.publishedTarget;
         if ((entity !== 'project' && entity !== 'service') || typeof idField !== 'string') {
            throw new Error(`${label} declares an invalid publishedTarget.`);
         }
         const shape = (meta.inputSchema as { shape?: Record<string, z.ZodType> }).shape;
         if (!shape?.[idField]?.safeParse(1).success) {
            throw new Error(
               `${label} declares publishedTarget.idField "${idField}" that is not a numeric ` +
                  'field of its inputSchema.',
            );
         }
      }
      if (meta.editTarget !== undefined) {
         if (behavior !== 'mutating') {
            throw new Error(
               `${label} is ${behavior} and must not declare editTarget — ` +
                  'readonly tools change nothing, destructive tools are always approved.',
            );
         }
         if (typeof meta.editTarget !== 'function') {
            throw new Error(`${label} declares editTarget that is not a function.`);
         }
      }
      if (behavior === 'readonly' && meta.audit) {
         throw new Error(`${label} is readonly and must not declare audit metadata.`);
      }
      if (behavior !== 'readonly' && !meta.audit) {
         throw new Error(
            `${label} is ${behavior} and must declare audit { action, resourceType }.`,
         );
      }
   }

   private registerTool(registered: RegisteredAiTool): void {
      const existing = this.tools.get(registered.meta.name);
      if (existing) {
         throw new Error(
            `Duplicate AI tool name "${registered.meta.name}" from ${existing.source} and ` +
               `${registered.source}.`,
         );
      }
      this.tools.set(registered.meta.name, registered);
   }
}
