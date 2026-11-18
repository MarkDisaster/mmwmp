import type { NavigateOptions, RegisteredRouter } from '@tanstack/react-router';
import type { i18n as I18nInstance } from 'i18next';
import { z } from 'zod/v4';

import type { ChatMode } from '@/features/ai-chat/types/aiChat';
import {
   ADMIN_ENTITIES,
   ADMIN_ENTITY_ROUTES,
   ADMIN_PAGE_ROUTES,
   ADMIN_SEARCH_MAX_LENGTH,
   entityLinkOptions,
   isSearchablePageRoute,
   pageLinkOptions,
} from '@/features/ai-chat/utils/adminNavigation';

export type ClientToolDeps = {
   i18n: I18nInstance;
   router: Pick<RegisteredRouter, 'navigate' | 'buildLocation' | 'state'>;
   setChatMode: (mode: ChatMode) => void;
   revealPage: () => void;
   canOpen?: (route: string) => boolean;
};

export const NAVIGATION_TIMEOUT_MS = 10_000;

const CLIENT_TOOL_INPUT_SCHEMAS = {
   switchLanguage: z.object({ language: z.enum(['cs', 'en']) }),
   navigateTo: z.object({
      path: z.enum(ADMIN_PAGE_ROUTES),
      search: z.string().trim().min(1).max(ADMIN_SEARCH_MAX_LENGTH).optional(),
   }),
   openEntity: z.object({
      entity: z.enum(ADMIN_ENTITIES),
      id: z.int().positive(),
   }),
   setChatMode: z.object({ mode: z.enum(['fullpage', 'sidebar', 'floating']) }),
};

export type ClientToolName = keyof typeof CLIENT_TOOL_INPUT_SCHEMAS;

export const isClientTool = (name: string): name is ClientToolName =>
   Object.hasOwn(CLIENT_TOOL_INPUT_SCHEMAS, name);

const parseInput = <TSchema extends z.ZodType>(
   schema: TSchema,
   input: unknown,
): z.output<TSchema> => {
   const result = schema.safeParse(input);
   if (!result.success) {
      throw new Error(`Invalid tool input: ${z.prettifyError(result.error)}`);
   }
   return result.data;
};

const settleWithin = async (promise: Promise<unknown>, ms: number) => {
   let timer: ReturnType<typeof setTimeout> | undefined;
   try {
      await Promise.race([
         promise.catch(() => undefined),
         new Promise<void>((resolve) => {
            timer = setTimeout(resolve, ms);
         }),
      ]);
   } finally {
      clearTimeout(timer);
   }
};

const assertCanOpen = (deps: ClientToolDeps, route: string) => {
   if (deps.canOpen && !deps.canOpen(route)) {
      throw new Error(
         `The user's role has no permission to open ${route}. Tell the user briefly; do not retry.`,
      );
   }
};

const navigate = async (deps: ClientToolDeps, options: NavigateOptions, notFound: string) => {
   const target = deps.router.buildLocation(options).pathname;
   deps.revealPage();
   await settleWithin(deps.router.navigate(options), NAVIGATION_TIMEOUT_MS);

   const { location, matches, statusCode } = deps.router.state;
   if (statusCode === 404 || matches.some((match) => match.status === 'notFound')) {
      throw new Error(notFound);
   }
   if (location.pathname !== target) {
      return {
         path: target,
         navigated: false,
         reason:
            'The page did not open: the user may be confirming whether to leave unsaved changes, ' +
            'or the record is gone. Tell the user briefly.',
      };
   }
   return { path: location.href, navigated: true };
};

export const executeClientTool = async (
   name: ClientToolName,
   input: unknown,
   deps: ClientToolDeps,
): Promise<Record<string, unknown>> => {
   switch (name) {
      case 'switchLanguage': {
         const { language } = parseInput(CLIENT_TOOL_INPUT_SCHEMAS.switchLanguage, input);
         await deps.i18n.changeLanguage(language);
         return { language, applied: true };
      }
      case 'navigateTo': {
         const { path, search } = parseInput(CLIENT_TOOL_INPUT_SCHEMAS.navigateTo, input);
         if (search !== undefined && !isSearchablePageRoute(path)) {
            throw new Error(`Invalid tool input: ${path} has no search box. Omit \`search\`.`);
         }
         assertCanOpen(deps, path);
         return navigate(deps, pageLinkOptions(path, search), `The page ${path} does not exist.`);
      }
      case 'openEntity': {
         const { entity, id } = parseInput(CLIENT_TOOL_INPUT_SCHEMAS.openEntity, input);
         assertCanOpen(deps, ADMIN_ENTITY_ROUTES[entity]);
         return {
            entity,
            id,
            ...(await navigate(
               deps,
               entityLinkOptions(entity, id),
               `The ${entity} with id ${id} does not exist. Find the right id first.`,
            )),
         };
      }
      case 'setChatMode': {
         const { mode } = parseInput(CLIENT_TOOL_INPUT_SCHEMAS.setChatMode, input);
         deps.setChatMode(mode);
         return { mode, applied: true };
      }
   }
};
