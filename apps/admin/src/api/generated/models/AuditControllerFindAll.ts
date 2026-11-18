/* eslint-disable */

import type { AuditLogEntity } from './AuditLogEntity';

export const auditControllerFindAllQueryParamsActorTypeEnum = {
   user: 'user',
   ai: 'ai',
   system: 'system',
} as const;

export type AuditControllerFindAllQueryParamsActorTypeEnumKey =
   (typeof auditControllerFindAllQueryParamsActorTypeEnum)[keyof typeof auditControllerFindAllQueryParamsActorTypeEnum];

export type AuditControllerFindAllQueryParams = {
   page?: number;
   limit?: number;
   userId?: number;
   action?: string;
   resourceType?: string;
   actorType?: AuditControllerFindAllQueryParamsActorTypeEnumKey;
   from?: string;
   to?: string;
};

export type AuditControllerFindAll200 = {
   data: AuditLogEntity[];
   totalCount: number;
};

export type AuditControllerFindAllQueryResponse = AuditControllerFindAll200;

export type AuditControllerFindAllQuery = {
   Response: AuditControllerFindAll200;
   QueryParams: AuditControllerFindAllQueryParams;
   Errors: any;
};
