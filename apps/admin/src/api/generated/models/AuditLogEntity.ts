/* eslint-disable */

import type { AuditLogUserEntity } from './AuditLogUserEntity';

export const auditLogEntityActorTypeEnum = {
   user: 'user',
   ai: 'ai',
   system: 'system',
} as const;

export type AuditLogEntityActorTypeEnumKey =
   (typeof auditLogEntityActorTypeEnum)[keyof typeof auditLogEntityActorTypeEnum];

export type AuditLogEntity = {
   id: number;
   userId: number | null;
   user: AuditLogUserEntity | null;
   actorType: AuditLogEntityActorTypeEnumKey;
   action: string;
   resourceType: string;
   resourceId: string | null;
   metadata: {
      method?: string;
      path?: string;
      params?: {
         [key: string]: string;
      };
      query?: {
         [key: string]: any;
      };
      body?: any;
      input?: any;
      error?: string;
      resourceName?: string;
      [key: string]: unknown;
   } | null;
   ipAddress: string | null;
   userAgent: string | null;
   conversationId: string | null;
   createdAt: string;
};
