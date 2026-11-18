import { Injectable } from '@nestjs/common';

import { AuditService } from '@/audit/audit.service';
import { redact } from '@/audit/redact';
import type { Prisma } from '@/generated/prisma/client';

import type { ToolContext } from './tool-auth';

export type ToolAuditEntry = {
   action: string;
   resourceType: string;
   resourceId?: string | number | null;
   metadata?: Prisma.InputJsonValue | null;
};

export type ToolFailure = {
   toolName: string;
   input: unknown;
   error: unknown;
};

const MAX_ERROR_LENGTH = 1000;

const TOOL_INPUT_SENSITIVE_KEYS: ReadonlySet<string> = new Set(['value']);

const MAX_METADATA_STRING_LENGTH = 2000;
const MAX_METADATA_BYTES = 16 * 1024;
const TRUNCATED_SUFFIX = '…[truncated]';

const truncateLongStrings = (_key: string, value: unknown): unknown =>
   typeof value === 'string' && value.length > MAX_METADATA_STRING_LENGTH
      ? value.slice(0, MAX_METADATA_STRING_LENGTH) + TRUNCATED_SUFFIX
      : value;

const toAuditJson = (value: unknown): Prisma.InputJsonValue | null => {
   const capped = JSON.stringify(redact(value, TOOL_INPUT_SENSITIVE_KEYS), truncateLongStrings);
   if (capped === undefined) return null;

   const bytes = Buffer.byteLength(capped);
   if (bytes > MAX_METADATA_BYTES) {
      return { truncated: true, bytes };
   }
   return JSON.parse(capped) as Prisma.InputJsonValue;
};

@Injectable()
export class ToolAuditService {
   constructor(private readonly audit: AuditService) {}

   log(ctx: ToolContext, entry: ToolAuditEntry): Promise<void> {
      return this.audit.log({
         actorType: 'ai',
         userId: ctx.user.id,
         conversationId: ctx.conversationId,
         ipAddress: ctx.ipAddress,
         userAgent: ctx.userAgent,
         action: entry.action,
         resourceType: entry.resourceType,
         resourceId: entry.resourceId,
         metadata: entry.metadata,
      });
   }

   logToolSuccess(ctx: ToolContext, success: ToolAuditEntry): Promise<void> {
      return this.log(ctx, success);
   }

   logToolFailure(ctx: ToolContext, failure: ToolFailure): Promise<void> {
      const message =
         failure.error instanceof Error ? failure.error.message : String(failure.error);

      return this.log(ctx, {
         action: `tool.${failure.toolName}.failed`,
         resourceType: 'tool',
         resourceId: failure.toolName,
         metadata: {
            input: toAuditJson(failure.input),
            error: message.slice(0, MAX_ERROR_LENGTH),
         },
      });
   }
}
