import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit:action';

export type AuditActionMeta = {
   action: string;
   resourceType: string;
   summarize?: readonly string[];
};

export type AuditActionOptions = Pick<AuditActionMeta, 'summarize'>;

export const AuditAction = (action: string, resourceType: string, options?: AuditActionOptions) =>
   SetMetadata(AUDIT_ACTION_KEY, {
      action,
      resourceType,
      ...options,
   } satisfies AuditActionMeta);
