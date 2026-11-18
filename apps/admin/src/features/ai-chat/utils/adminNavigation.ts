import { linkOptions } from '@tanstack/react-router';

import type { FileRouteTypes } from '@/routes/routeTree.gen';

export const ADMIN_PAGE_ROUTES = [
   '/',
   '/projects',
   '/projects/create',
   '/services',
   '/services/new',
   '/tags',
   '/tags/create',
   '/users',
   '/roles',
   '/roles/create',
   '/files',
   '/files/upload',
   '/contact',
   '/profile',
   '/audit',
   '/runner-scores',
   '/trash',
] as const satisfies readonly FileRouteTypes['to'][];

export type AdminPageRoute = (typeof ADMIN_PAGE_ROUTES)[number];

const SEARCHABLE_ADMIN_PAGE_ROUTES = [
   '/projects',
   '/services',
   '/tags',
   '/users',
   '/roles',
   '/files',
   '/runner-scores',
] as const satisfies readonly AdminPageRoute[];

type SearchablePageRoute = (typeof SEARCHABLE_ADMIN_PAGE_ROUTES)[number];

export const ADMIN_ENTITY_ROUTES = {
   project: '/projects/$projectId',
   service: '/services/$serviceId',
   tag: '/tags/$tagId',
   role: '/roles/$roleId',
} as const satisfies Record<string, FileRouteTypes['to']>;

export type AdminEntity = keyof typeof ADMIN_ENTITY_ROUTES;

export const ADMIN_ENTITIES = Object.keys(ADMIN_ENTITY_ROUTES) as [AdminEntity, ...AdminEntity[]];

export const NOT_NAVIGABLE_ROUTES = {
   '/login': 'public page before login',
   '/forgot-password': 'public page before login',
   '/reset-password/$token': 'opened from the e-mail link only',
   '/invitation/$token': 'opened from the e-mail link only',
} satisfies Record<
   Exclude<FileRouteTypes['to'], AdminPageRoute | (typeof ADMIN_ENTITY_ROUTES)[AdminEntity]>,
   string
>;

export const ADMIN_SEARCH_MAX_LENGTH = 100;

const PAGE_ROUTES: ReadonlySet<string> = new Set(ADMIN_PAGE_ROUTES);
const SEARCHABLE_ROUTES: ReadonlySet<string> = new Set(SEARCHABLE_ADMIN_PAGE_ROUTES);

export const isSearchablePageRoute = (route: AdminPageRoute): route is SearchablePageRoute =>
   SEARCHABLE_ROUTES.has(route);

export const pageLinkOptions = (route: AdminPageRoute, search?: string) =>
   search && isSearchablePageRoute(route)
      ? linkOptions({ to: route, search: { search } })
      : linkOptions({ to: route });

export const entityLinkOptions = (entity: AdminEntity, id: number) => {
   switch (entity) {
      case 'project':
         return linkOptions({ to: '/projects/$projectId', params: { projectId: id } });
      case 'service':
         return linkOptions({ to: '/services/$serviceId', params: { serviceId: id } });
      case 'tag':
         return linkOptions({ to: '/tags/$tagId', params: { tagId: id } });
      case 'role':
         return linkOptions({ to: '/roles/$roleId', params: { roleId: id } });
   }
};

export type AdminLinkTarget =
   | { kind: 'page'; route: AdminPageRoute; search?: string }
   | { kind: 'entity'; entity: AdminEntity; id: number };

const ENTITY_PATTERNS = Object.entries(ADMIN_ENTITY_ROUTES).map(([entity, route]) => ({
   entity: entity as AdminEntity,
   pattern: new RegExp(`^${route.replace(/\$\w+$/, '([1-9]\\d{0,9})')}$`),
}));

export const resolveAdminHref = (href: string, origin: string): AdminLinkTarget | null => {
   const isRootRelative = href.startsWith('/') && !href.startsWith('//');
   if (!isRootRelative && !/^[a-z][a-z\d+.-]*:/i.test(href)) return null;

   let url: URL;
   try {
      url = new URL(href, origin);
   } catch {
      return null;
   }
   if (url.origin !== origin) return null;

   const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
   if (PAGE_ROUTES.has(path)) {
      const route = path as AdminPageRoute;
      const search = url.searchParams.get('search')?.trim().slice(0, ADMIN_SEARCH_MAX_LENGTH);
      return search && isSearchablePageRoute(route)
         ? { kind: 'page', route, search }
         : { kind: 'page', route };
   }
   for (const { entity, pattern } of ENTITY_PATTERNS) {
      const id = Number(pattern.exec(path)?.[1]);
      if (Number.isSafeInteger(id) && id > 0) return { kind: 'entity', entity, id };
   }
   return null;
};

export const linkOptionsOf = (target: AdminLinkTarget) =>
   target.kind === 'page'
      ? pageLinkOptions(target.route, target.search)
      : entityLinkOptions(target.entity, target.id);
