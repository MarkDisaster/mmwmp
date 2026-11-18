import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CLIENT_TOOLS } from '@/chat/client-tools';

import {
   type ApiRoute,
   discoverApiRoutes,
   discoverToolMetadata,
   type RouteKey,
} from './endpoint-inventory.fixture';

type Coverage = { tools: readonly [string, ...string[]] } | { exception: string };

const EDIT_LOCK_PRESENCE =
   'presence of the open editor (heartbeat of a browser tab); the write tools read the lock themselves (`editTarget`)';

const ADMIN_EVENTS =
   'the live refresh of the admin screens; the model reads the data with its own tools';

const CHAT_TRANSPORT = 'the chat itself (conversations, streaming, voice input/output)';

const TYPE_CHECKED_TOOLS_FILES = {
   listTrash: { file: 'trash/tools/list-trash.tool.ts', check: 'assertTrashPermission(ctx, type)' },
   purgeTrash: {
      file: 'trash/tools/purge-trash.tool.ts',
      check: 'assertTrashPermission(ctx, type)',
   },
   listSlugRedirects: {
      file: 'slug-redirect/tools/list-slug-redirects.tool.ts',
      check: 'assertSlugRedirectPermission(ctx, type, PermissionAction.read)',
   },
   deleteSlugRedirect: {
      file: 'slug-redirect/tools/delete-slug-redirect.tool.ts',
      check: 'assertSlugRedirectPermission(ctx, type, PermissionAction.publish)',
   },
   checkLinks: {
      file: 'link-check/tools/check-links.tool.ts',
      check: 'hasToolPermission(ctx, PART_RESOURCE[part]',
   },
   auditContent: {
      file: 'content-insights/tools/audit-content.tool.ts',
      check: 'hasToolPermission(ctx, PART_RESOURCE[part]',
   },
   getContentStats: {
      file: 'content-insights/tools/get-content-stats.tool.ts',
      check: 'hasToolPermission(ctx, PART_RESOURCE[part]',
   },
} as const;
const TYPE_CHECKED_TOOLS: ReadonlySet<string> = new Set(Object.keys(TYPE_CHECKED_TOOLS_FILES));

const ROUTE_COVERAGE: Record<RouteKey, Coverage> = {
   'GET /ai/observability/summary': { tools: ['getAiUsageStats'] },
   'GET /ai/observability/interactions': { tools: ['getAiUsageStats'] },
   'POST /ai/voice/transcribe': { exception: CHAT_TRANSPORT },
   'POST /ai/voice/synthesize': { exception: CHAT_TRANSPORT },
   'GET /audit/logs': { tools: ['listAuditLogs', 'getContentStats'] },
   'POST /chat/conversations': { exception: CHAT_TRANSPORT },
   'GET /chat/conversations': { exception: CHAT_TRANSPORT },
   'GET /chat/conversations/:id/messages': { exception: CHAT_TRANSPORT },
   'POST /chat/conversations/:id/stream': { exception: CHAT_TRANSPORT },
   'GET /admin/events': { exception: ADMIN_EVENTS },
   'GET /contact': { tools: ['getContact'] },
   'PUT /contact': { tools: ['updateContact'] },
   'PUT /edit-locks/:entity/:id': { exception: EDIT_LOCK_PRESENCE },
   'DELETE /edit-locks/:entity/:id': { exception: EDIT_LOCK_PRESENCE },
   'GET /edit-locks/:entity/:id': { exception: EDIT_LOCK_PRESENCE },
   'POST /files': {
      exception:
         'uploads are attachments of a chat message: the admin uploads them before sending and ' +
         'the model gets the file ids',
   },
   'GET /files': { tools: ['listFiles', 'findUnusedFiles', 'auditContent', 'getContentStats'] },
   'GET /files/:id': { tools: ['getFile', 'viewFileImage'] },
   'PATCH /files/:id': { tools: ['updateFile', 'updateFiles'] },
   'DELETE /files/:id': { tools: ['deleteFile', 'deleteFiles'] },
   'GET /files/trash': { tools: ['listTrash'] },
   'POST /files/:id/restore': { tools: ['restoreFile'] },
   'DELETE /files/:id/permanent': { tools: ['purgeTrash'] },
   'POST /projects': { tools: ['createProject'] },
   'POST /projects/save': { tools: ['createProject'] },
   'PUT /projects/:id/save': {
      exception:
         'aggregate save of the editor form; the chat changes a project through the granular ' +
         'tools (updateProject, upsertProjectTranslation, media, links, tags)',
   },
   'GET /projects': {
      tools: ['listProjects', 'findProjects', 'auditContent', 'getContentStats', 'checkLinks'],
   },
   'GET /projects/:id/preview-url': { tools: ['getProjectPreviewUrl'] },
   'GET /projects/:id': { tools: ['getProject'] },
   'PATCH /projects/:id': { tools: ['updateProject', 'setProjectThumbnail'] },
   'POST /projects/:id/move': { tools: ['moveProject'] },
   'PATCH /projects/:id/status': { tools: ['updateProjectStatus', 'updateProjectsStatus'] },
   'DELETE /projects/:id': { tools: ['deleteProject'] },
   'GET /projects/trash': { tools: ['listTrash'] },
   'POST /projects/:id/restore': { tools: ['restoreProject'] },
   'DELETE /projects/:id/permanent': { tools: ['purgeTrash'] },
   'POST /projects/:id/translations/:language': { tools: ['upsertProjectTranslation'] },
   'POST /projects/:id/translations/:language/generate': {
      tools: ['generateProjectTranslation'],
   },
   'DELETE /projects/:id/translations/:language': { tools: ['deleteProjectTranslation'] },
   'POST /projects/:id/media': { tools: ['addProjectMedia'] },
   'DELETE /projects/:id/media/:mediaId': { tools: ['removeProjectMedia'] },
   'PUT /projects/:id/media/sort': { tools: ['sortProjectMedia'] },
   'PUT /projects/:id/links': { tools: ['setProjectLinks'] },
   'POST /projects/:id/tags': { tools: ['assignProjectTags', 'addProjectTag', 'addTagToProjects'] },
   'PUT /projects/:id/tags/sort': { tools: ['sortProjectTags'] },
   'DELETE /projects/:id/tags/:tagId': { tools: ['removeProjectTag', 'removeTagFromProjects'] },
   'GET /roles': { tools: ['listRoles', 'findRoles'] },
   'GET /roles/:id': { tools: ['getRole'] },
   'POST /roles': { tools: ['createRole'] },
   'PATCH /roles/:id': { tools: ['updateRole'] },
   'DELETE /roles/:id': { tools: ['deleteRole'] },
   'PUT /roles/:id/permissions': {
      tools: ['setRolePermissions', 'grantRolePermission', 'revokeRolePermission'],
   },
   'GET /runner-scores': {
      tools: ['listGameScores', 'getGameScoreStats', 'findSuspiciousGameScores'],
   },
   'PATCH /runner-scores/:id/visibility': { tools: ['setRunnerScoreVisibility'] },
   'DELETE /runner-scores/:id': { tools: ['deleteRunnerScore'] },
   'POST /services': { tools: ['createService'] },
   'POST /services/save': { tools: ['createService'] },
   'PUT /services/:id/save': {
      exception:
         'aggregate save of the editor form; the chat changes a service through the granular ' +
         'tools (updateService, upsertServiceTranslation, assignServiceProjects)',
   },
   'GET /services': {
      tools: ['listServices', 'findServices', 'auditContent', 'getContentStats', 'checkLinks'],
   },
   'GET /services/:id/preview-url': { tools: ['getServicePreviewUrl'] },
   'GET /services/:id': { tools: ['getService'] },
   'PATCH /services/:id': { tools: ['updateService'] },
   'POST /services/:id/move': { tools: ['moveService'] },
   'PATCH /services/:id/status': { tools: ['updateServiceStatus'] },
   'DELETE /services/:id': { tools: ['deleteService'] },
   'GET /services/trash': { tools: ['listTrash'] },
   'POST /services/:id/restore': { tools: ['restoreService'] },
   'DELETE /services/:id/permanent': { tools: ['purgeTrash'] },
   'POST /services/:id/translations/:language': { tools: ['upsertServiceTranslation'] },
   'POST /services/:id/translations/:language/generate': {
      tools: ['generateServiceTranslation'],
   },
   'DELETE /services/:id/translations/:language': { tools: ['deleteServiceTranslation'] },
   'POST /services/:id/projects': {
      tools: ['assignServiceProjects', 'addServiceProject', 'removeServiceProject'],
   },
   'POST /revalidation': { tools: ['revalidateWebsite'] },
   'GET /slug-redirects/projects': { tools: ['listSlugRedirects'] },
   'GET /slug-redirects/services': { tools: ['listSlugRedirects'] },
   'DELETE /slug-redirects/projects/:id': { tools: ['deleteSlugRedirect'] },
   'DELETE /slug-redirects/services/:id': { tools: ['deleteSlugRedirect'] },
   'POST /tags': { tools: ['createTag'] },
   'GET /tags': { tools: ['listTags', 'findTags', 'getContentStats'] },
   'GET /tags/:id': { tools: ['getTag'] },
   'PATCH /tags/:id': { tools: ['updateTag'] },
   'POST /tags/:id/move': { tools: ['moveTag'] },
   'DELETE /tags/:id': { tools: ['deleteTag'] },
   'GET /tags/trash': { tools: ['listTrash'] },
   'POST /tags/:id/restore': { tools: ['restoreTag'] },
   'DELETE /tags/:id/permanent': { tools: ['purgeTrash'] },
   'POST /users': {
      exception:
         'creates a user with a password; the chat invites instead (inviteUser), so no password ' +
         'passes through the model',
   },
   'GET /users': { tools: ['listUsers', 'findUsers', 'getContentStats'] },
   'GET /users/me': { tools: ['getMyProfile'] },
   'GET /users/:id': { tools: ['listUsers', 'findUsers'] },
   'PATCH /users/:id': { tools: ['updateUser'] },
   'PATCH /users/me/name': { tools: ['updateMyName'] },
   'PATCH /users/me/avatar': {
      exception: 'a cropped image upload on the profile page; the chat opens /profile',
   },
   'DELETE /users/me/avatar': {
      exception: 'part of the avatar editor on the profile page; the chat opens /profile',
   },
   'PATCH /users/me/password': {
      exception: 'a password never passes through the chat; the chat opens /profile',
   },
   'PATCH /users/:id/role': { tools: ['updateUser'] },
   'PATCH /users/:id/deactivate': { tools: ['deactivateUser'] },
   'PATCH /users/:id/reactivate': { tools: ['reactivateUser'] },
   'DELETE /users/:id': { tools: ['deleteUser'] },
   'POST /users/invitations': { tools: ['inviteUser'] },
   'POST /users/:id/resend-invitation': { tools: ['resendUserInvitation'] },
};

const PUBLIC_ROUTES: readonly RouteKey[] = [
   'POST /auth/login',
   'POST /auth/logout',
   'POST /auth/refresh',
   'POST /auth/forgot-password',
   'POST /auth/reset-password',
   'GET /health',
   'GET /public/contact',
   'GET /public/projects',
   'GET /public/projects/redirect/:slug',
   'GET /public/projects/:slug',
   'GET /public/runner-scores/top',
   'GET /public/runner-scores/rank',
   'POST /public/runner-scores/runs',
   'POST /public/runner-scores',
   'GET /public/services',
   'GET /public/services/redirect/:slug',
   'GET /public/services/:slug',
   'GET /public/tags',
   'HEAD /users/invitations/:token',
   'POST /users/invitations/:token/accept',
];

const ROUTES = discoverApiRoutes();
const TOOLS = new Map(discoverToolMetadata().map(({ meta }) => [meta.name, meta]));
const CLIENT_TOOL_NAMES: ReadonlySet<string> = new Set(Object.keys(CLIENT_TOOLS));

const byKey = (routes: ApiRoute[]) => routes.map((route) => route.key).sort();
const toolsOf = (coverage: Coverage) => ('tools' in coverage ? coverage.tools : []);

describe('AURORA covers the admin API — every authenticated route has a tool or a decision', () => {
   it('finds the controllers on disk', () => {
      expect(ROUTES.length).toBeGreaterThan(50);
      expect(new Set(byKey(ROUTES)).size).toBe(ROUTES.length);
   });

   it('lists every authenticated route exactly once (a new endpoint needs a row)', () => {
      expect(byKey(ROUTES.filter((route) => route.authenticated))).toEqual(
         Object.keys(ROUTE_COVERAGE).sort(),
      );
   });

   it('keeps every other route public on purpose (an admin route without AuthGuard fails)', () => {
      expect(byKey(ROUTES.filter((route) => !route.authenticated))).toEqual(
         [...PUBLIC_ROUTES].sort(),
      );
   });

   it('names only tools that exist', () => {
      const unknown = Object.values(ROUTE_COVERAGE)
         .flatMap(toolsOf)
         .filter((name) => !TOOLS.has(name) && !CLIENT_TOOL_NAMES.has(name));
      expect(unknown).toEqual([]);
   });

   it('requires of each covering tool the same permission as the route (RBAC parity)', () => {
      const mismatches = ROUTES.flatMap((route) => {
         const coverage = ROUTE_COVERAGE[route.key];
         if (!coverage || !route.permission) return [];
         const expected = `${route.permission.resource}.${route.permission.action}`;
         return toolsOf(coverage)
            .map((name) => TOOLS.get(name))
            .filter(
               (meta): meta is NonNullable<typeof meta> =>
                  meta !== undefined && !TYPE_CHECKED_TOOLS.has(meta.name),
            )
            .map((meta) => ({
               route: route.key,
               tool: meta.name,
               permission:
                  typeof meta.permission === 'string'
                     ? meta.permission
                     : `${meta.permission.resource}.${meta.permission.action}`,
            }))
            .filter(({ permission }) => permission !== expected)
            .map((mismatch) => ({ ...mismatch, expected }));
      });
      expect(mismatches).toEqual([]);
   });

   it('checks the permission of the chosen type itself in the tools that cover several resources', () => {
      for (const [name, { file, check }] of Object.entries(TYPE_CHECKED_TOOLS_FILES)) {
         const source = readFileSync(join(__dirname, '../../..', file), 'utf8');
         expect({ name, checksType: source.includes(check) }).toEqual({ name, checksType: true });
      }
      const trashRoutes = ROUTES.filter((route) => /\/(trash|:id\/permanent)$/.test(route.key));
      expect([...new Set(trashRoutes.map((route) => route.permission?.action))].sort()).toEqual([
         'delete',
      ]);
      expect(trashRoutes.map((route) => route.permission?.resource).sort()).toEqual([
         'files',
         'files',
         'projects',
         'projects',
         'services',
         'services',
         'tags',
         'tags',
      ]);
   });

   it('detects the admin-only routes (AdminGuard), so the check below is not vacuous', () => {
      expect(byKey(ROUTES.filter((route) => route.adminOnly))).toEqual([
         'GET /ai/observability/interactions',
         'GET /ai/observability/summary',
      ]);
   });

   it('requires an admin role of each tool that covers an admin-only route', () => {
      const notAdminOnly = ROUTES.filter((route) => route.adminOnly).flatMap((route) =>
         toolsOf(ROUTE_COVERAGE[route.key] ?? { exception: '' })
            .map((name) => TOOLS.get(name))
            .filter((meta) => meta !== undefined)
            .filter((meta) => meta.permission !== 'admin')
            .map((meta) => ({ route: route.key, tool: meta.name })),
      );
      expect(notAdminOnly).toEqual([]);
   });

   it('gives an admin tool only to admin routes and an authenticated one to open routes', () => {
      const byTool = new Map<string, ApiRoute[]>();
      for (const route of ROUTES) {
         for (const name of toolsOf(ROUTE_COVERAGE[route.key] ?? { exception: '' })) {
            byTool.set(name, [...(byTool.get(name) ?? []), route]);
         }
      }
      const wrong = [...TOOLS.values()].flatMap((meta) => {
         const routes = byTool.get(meta.name) ?? [];
         if (meta.permission === 'admin' && !routes.every((route) => route.adminOnly)) {
            return [{ tool: meta.name, expected: 'AdminGuard routes' }];
         }
         if (meta.permission === 'authenticated' && routes.some((route) => route.permission)) {
            return [{ tool: meta.name, expected: 'routes without @RequirePermission' }];
         }
         return [];
      });
      expect(wrong).toEqual([]);
   });

   it('backs every server tool by a route it covers (no capability the admin API lacks)', () => {
      const covering = new Set(Object.values(ROUTE_COVERAGE).flatMap(toolsOf));
      expect([...TOOLS.keys()].filter((name) => !covering.has(name)).sort()).toEqual([]);
   });

   it('gives every exception a reason', () => {
      for (const [key, coverage] of Object.entries(ROUTE_COVERAGE)) {
         if ('exception' in coverage)
            expect({ key, ok: coverage.exception.length > 10 }).toEqual({ key, ok: true });
      }
   });
});
