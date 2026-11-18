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
] as const;

export type AdminPageRoute = (typeof ADMIN_PAGE_ROUTES)[number];

export const SEARCHABLE_ADMIN_PAGE_ROUTES = [
   '/projects',
   '/services',
   '/tags',
   '/users',
   '/roles',
   '/files',
   '/runner-scores',
] as const satisfies readonly AdminPageRoute[];

export const ADMIN_ENTITY_ROUTES = {
   project: '/projects/$projectId',
   service: '/services/$serviceId',
   tag: '/tags/$tagId',
   role: '/roles/$roleId',
} as const;

export type AdminEntity = keyof typeof ADMIN_ENTITY_ROUTES;

export const ADMIN_ENTITIES = Object.keys(ADMIN_ENTITY_ROUTES) as [AdminEntity, ...AdminEntity[]];

export const ADMIN_SEARCH_MAX_LENGTH = 100;

export const adminEntityPath = (entity: AdminEntity, id: number): string =>
   ADMIN_ENTITY_ROUTES[entity].replace(/\$\w+$/, String(id));

export const adminListPath = (
   page: (typeof SEARCHABLE_ADMIN_PAGE_ROUTES)[number],
   search?: string,
): string => {
   const term = search?.trim().slice(0, ADMIN_SEARCH_MAX_LENGTH);
   return term ? `${page}?${new URLSearchParams({ search: term }).toString()}` : page;
};

export type AdminPageContext =
   | { kind: 'page'; route: AdminPageRoute }
   | { kind: 'entity'; entity: AdminEntity; id: number };

const PAGE_ROUTE_SET: ReadonlySet<string> = new Set(ADMIN_PAGE_ROUTES);

const ENTITY_PATTERNS = Object.entries(ADMIN_ENTITY_ROUTES).map(([entity, route]) => ({
   entity: entity as AdminEntity,
   pattern: new RegExp(`^${route.replace(/\$\w+$/, '([1-9]\\d{0,9})')}$`),
}));

export const parseAdminPath = (pathname: string): AdminPageContext | null => {
   const path = pathname.split(/[?#]/, 1)[0] ?? '';
   const normalised = path.length > 1 ? path.replace(/\/+$/, '') : path;

   if (PAGE_ROUTE_SET.has(normalised)) {
      return { kind: 'page', route: normalised as AdminPageRoute };
   }
   for (const { entity, pattern } of ENTITY_PATTERNS) {
      const id = pattern.exec(normalised)?.[1];
      if (id) {
         const parsed = Number(id);
         if (Number.isSafeInteger(parsed)) return { kind: 'entity', entity, id: parsed };
      }
   }
   return null;
};
