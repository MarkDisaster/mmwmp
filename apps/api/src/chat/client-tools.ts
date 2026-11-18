import { tool, type ToolSet } from 'ai';
import { z } from 'zod';

import {
   ADMIN_ENTITIES,
   ADMIN_PAGE_ROUTES,
   ADMIN_SEARCH_MAX_LENGTH,
   SEARCHABLE_ADMIN_PAGE_ROUTES,
} from '@/ai/admin-routes';

const switchLanguageTool = tool({
   description:
      'Switch the admin UI language between Czech (`cs`) and English (`en`). ' +
      'Use when the user asks to "change/switch language", "přepni do češtiny", etc. ' +
      "Takes effect immediately in the user's browser — no page reload.",
   inputSchema: z.object({
      language: z.enum(['cs', 'en']).describe('Target UI language code.'),
   }),
});

const navigateToTool = tool({
   description:
      'Open an admin page in the same window: a list, a create form, contact, profile, audit log, ' +
      'runner scores or the dashboard. Use for "otevři projekty", "ukaž audit log", "nový štítek". ' +
      'To open one record (a project, service, tag or role) use `openEntity` instead. ' +
      'Users and files have no detail page: open their list with `search` set to the name or ' +
      'e-mail. If the page the user wants is not in the list, say so instead of guessing.',
   inputSchema: z.object({
      path: z.enum(ADMIN_PAGE_ROUTES).describe('Target admin route path.'),
      search: z
         .string()
         .trim()
         .min(1)
         .max(ADMIN_SEARCH_MAX_LENGTH)
         .optional()
         .describe(
            `Pre-fills the search box of a list page (${SEARCHABLE_ADMIN_PAGE_ROUTES.join(', ')}). ` +
               'A name, slug or e-mail, not a sentence. Omit for other pages.',
         ),
   }),
});

const openEntityTool = tool({
   description:
      'Open the detail (editor) of one record in the admin: a project, service, tag or role. ' +
      'Needs the numeric id: when the user names the record ("otevři projekt Selltoro"), find it ' +
      'first with `findProjects` / `findServices` / `findTags` / `findRoles`. Use the id of the ' +
      'current page context for "tento projekt". A full-screen chat then moves to the side panel ' +
      '(on a phone it closes) so the user sees the page; reply with one short sentence.',
   inputSchema: z.object({
      entity: z.enum(ADMIN_ENTITIES).describe('Kind of record to open.'),
      id: z.number().int().positive().describe('Numeric id of the record.'),
   }),
});

const setChatModeTool = tool({
   description:
      'Change how the chat panel is presented. `fullpage` = chat fills the viewport, ' +
      '`sidebar` = docked on the right next to the admin, `floating` = small overlay window. ' +
      'Use when the user asks to "udělej chat na celou stránku", "zmenši chat", etc.',
   inputSchema: z.object({
      mode: z.enum(['fullpage', 'sidebar', 'floating']).describe('Target chat panel layout mode.'),
   }),
});

export const CLIENT_TOOLS = {
   switchLanguage: switchLanguageTool,
   navigateTo: navigateToTool,
   openEntity: openEntityTool,
   setChatMode: setChatModeTool,
} satisfies ToolSet;
