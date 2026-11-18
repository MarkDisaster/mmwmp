import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AuditService } from '@/audit/audit.service';
import { AUDIT_ACTION_KEY, type AuditActionMeta } from '@/audit/decorators/audit-action.decorator';
import { redact, summarizeKeys } from '@/audit/redact';
import { clientIp } from '@/common/request/client-ip';
import type { Prisma } from '@/generated/prisma/client';

type RequestWithUser = Request & { user?: { id?: number | null; role?: { isAdmin?: boolean } } };

@Injectable()
export class AuditInterceptor implements NestInterceptor {
   constructor(
      private readonly reflector: Reflector,
      private readonly audit: AuditService,
   ) {}

   intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      const meta = this.reflector.getAllAndOverride<AuditActionMeta | undefined>(AUDIT_ACTION_KEY, [
         context.getHandler(),
         context.getClass(),
      ]);

      if (!meta) {
         return next.handle();
      }

      const http = context.switchToHttp();
      const req = http.getRequest<RequestWithUser>();

      if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
         return next.handle();
      }

      const userId = req.user?.id ?? null;
      const actorType = 'user' as const;
      const params = (req.params ?? {}) as Record<string, string>;
      const body = summarizeKeys(redact(req.body), new Set(meta.summarize ?? []));
      const query = req.query && Object.keys(req.query).length > 0 ? req.query : undefined;
      const ipAddress = clientIp(req);
      const userAgent = (req.headers['user-agent'] as string | undefined) ?? null;

      return next.handle().pipe(
         tap({
            next: (response) => {
               const resourceId = resolveResourceId(params, response);
               const resourceName = resolveResourceName(response);
               const metadata = buildMetadata(req, params, query, body);
               void this.audit.log({
                  userId,
                  actorType,
                  action: meta.action,
                  resourceType: meta.resourceType,
                  resourceId,
                  metadata: resourceName ? { ...(metadata as object), resourceName } : metadata,
                  ipAddress,
                  userAgent,
               });
            },
            error: (err: unknown) => {
               const message = err instanceof Error ? err.message : String(err);
               const metadata = buildMetadata(req, params, query, body, message);
               void this.audit.log({
                  userId,
                  actorType,
                  action: `${meta.action}.failed`,
                  resourceType: meta.resourceType,
                  resourceId: resolveResourceId(params, null),
                  metadata,
                  ipAddress,
                  userAgent,
               });
            },
         }),
      );
   }
}

const buildMetadata = (
   req: Request,
   params: Record<string, string>,
   query: unknown,
   body: unknown,
   error?: string,
): Prisma.InputJsonValue => {
   const meta: Record<string, unknown> = {
      method: req.method,
      path: (req.originalUrl ?? req.url ?? '').split('?')[0],
   };
   if (Object.keys(params).length > 0) meta.params = params;
   if (query !== undefined) meta.query = query;
   if (body !== undefined) meta.body = body;
   if (error !== undefined) meta.error = error;
   return meta as Prisma.InputJsonValue;
};

const RESOURCE_ID_KEYS = ['id', 'slug', 'key', 'uuid'] as const;

const translatedName = (translations: unknown): string | null => {
   if (!Array.isArray(translations)) return null;
   const named = translations.filter(
      (tr): tr is { language?: unknown; name: string } =>
         !!tr && typeof tr === 'object' && typeof (tr as { name?: unknown }).name === 'string',
   );
   return (named.find((tr) => tr.language === 'cs') ?? named[0])?.name ?? null;
};

export const resolveResourceName = (response: unknown): string | null => {
   if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      const name =
         r['title'] ?? r['name'] ?? translatedName(r['translations']) ?? r['slug'] ?? null;
      if (name != null) return String(name);
   }
   return null;
};

const resolveResourceId = (params: Record<string, string>, response: unknown): string | null => {
   for (const key of RESOURCE_ID_KEYS) {
      if (params[key]) return params[key];
   }
   if (response && typeof response === 'object') {
      const id = (response as { id?: unknown }).id;
      if (id != null) {
         return String(id);
      }
   }
   const first = Object.values(params)[0];
   return first ?? null;
};
