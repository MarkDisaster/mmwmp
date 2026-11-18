import { readdirSync } from 'node:fs';
import path from 'node:path';

import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import {
   PERMISSION_KEY,
   type RequiredPermission,
} from '@/common/decorators/require-permission.decorator';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AuthGuard } from '@/common/guards/auth.guard';

const SRC_DIR = path.resolve(__dirname, '..', '..', '..');

export type RouteKey = `${keyof typeof RequestMethod} /${string}`;

export type ApiRoute = {
   key: RouteKey;
   permission: RequiredPermission | null;
   authenticated: boolean;
   adminOnly: boolean;
   source: string;
};

type Class = abstract new (...args: never[]) => unknown;

const isClass = (value: unknown): value is Class => typeof value === 'function';

const loadExportedClasses = (suffix: string) =>
   readdirSync(SRC_DIR, { recursive: true })
      .map(String)
      .filter((file) => file.endsWith(suffix) && !file.includes('__tests__'))
      .sort()
      .flatMap((file) => {
         const exported = require(path.join(SRC_DIR, file)) as Record<string, unknown>;
         return Object.values(exported)
            .filter(isClass)
            .map((Class) => ({ file, Class }));
      });

const joinPath = (...parts: unknown[]) =>
   `/${parts
      .flatMap((part) => (Array.isArray(part) ? part : [part]))
      .map((part) => String(part ?? '').replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/')}`;

export const discoverApiRoutes = (): ApiRoute[] =>
   loadExportedClasses('.controller.ts')
      .filter(({ Class }) => Reflect.hasMetadata(PATH_METADATA, Class))
      .flatMap(({ file, Class }) => {
         const prototype = Class.prototype as Record<string, unknown>;
         const classGuards = (Reflect.getMetadata(GUARDS_METADATA, Class) ?? []) as unknown[];
         const classPermission = Reflect.getMetadata(PERMISSION_KEY, Class) as
            | RequiredPermission
            | undefined;

         return Object.getOwnPropertyNames(prototype)
            .filter((name) => name !== 'constructor')
            .map((name) => prototype[name])
            .filter(
               (handler): handler is object =>
                  typeof handler === 'function' && Reflect.hasMetadata(METHOD_METADATA, handler),
            )
            .map((handler): ApiRoute => {
               const method = RequestMethod[
                  Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod
               ] as keyof typeof RequestMethod;
               const guards = [
                  ...classGuards,
                  ...((Reflect.getMetadata(GUARDS_METADATA, handler) ?? []) as unknown[]),
               ];
               const permission =
                  (Reflect.getMetadata(PERMISSION_KEY, handler) as
                     | RequiredPermission
                     | undefined) ??
                  classPermission ??
                  null;
               return {
                  key: `${method} ${joinPath(
                     Reflect.getMetadata(PATH_METADATA, Class),
                     Reflect.getMetadata(PATH_METADATA, handler),
                  )}` as RouteKey,
                  permission,
                  authenticated: guards.includes(AuthGuard),
                  adminOnly: guards.includes(AdminGuard),
                  source: `${file}#${(handler as { name: string }).name}`,
               };
            });
      });

export type DiscoveredToolMeta = { file: string; meta: AiToolMetadata; Class: Class };

export const discoverToolMetadata = (): DiscoveredToolMeta[] =>
   loadExportedClasses('.tool.ts').flatMap(({ file, Class }) => {
      const meta = Reflect.getMetadata(AiTool.KEY, Class) as AiToolMetadata | undefined;
      return meta ? [{ file, meta, Class }] : [];
   });
