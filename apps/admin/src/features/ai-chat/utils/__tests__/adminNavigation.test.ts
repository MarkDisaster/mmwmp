import { describe, expect, it } from 'vitest';

import {
   ADMIN_ENTITIES,
   ADMIN_ENTITY_ROUTES,
   entityLinkOptions,
   NOT_NAVIGABLE_ROUTES,
   pageLinkOptions,
   resolveAdminHref,
} from '../adminNavigation';

const ORIGIN = 'https://admin.marek.media';

describe('entityLinkOptions', () => {
   it('should navigate each entity to its detail route', () => {
      for (const entity of ADMIN_ENTITIES) {
         expect(entityLinkOptions(entity, 7).to).toBe(ADMIN_ENTITY_ROUTES[entity]);
      }
      expect(entityLinkOptions('tag', 7)).toEqual({ to: '/tags/$tagId', params: { tagId: 7 } });
   });
});

describe('pageLinkOptions', () => {
   it('should carry a search only to a list page with a search box', () => {
      expect(pageLinkOptions('/files', 'logo')).toEqual({
         to: '/files',
         search: { search: 'logo' },
      });
      expect(pageLinkOptions('/contact', 'logo')).toEqual({ to: '/contact' });
   });
});

describe('NOT_NAVIGABLE_ROUTES', () => {
   it('should give each excluded route a reason', () => {
      expect(Object.values(NOT_NAVIGABLE_ROUTES).every((reason) => reason.length > 0)).toBe(true);
   });
});

describe('resolveAdminHref', () => {
   it('should resolve an admin page, with a search for a list', () => {
      expect(resolveAdminHref('/projects', ORIGIN)).toEqual({ kind: 'page', route: '/projects' });
      expect(resolveAdminHref('/users?search=jan%40example.com', ORIGIN)).toEqual({
         kind: 'page',
         route: '/users',
         search: 'jan@example.com',
      });
      expect(resolveAdminHref('/contact?search=x', ORIGIN)).toEqual({
         kind: 'page',
         route: '/contact',
      });
      expect(resolveAdminHref(`${ORIGIN}/tags/`, ORIGIN)).toEqual({ kind: 'page', route: '/tags' });
   });

   it('should resolve the detail of a record', () => {
      expect(resolveAdminHref('/projects/12', ORIGIN)).toEqual({
         kind: 'entity',
         entity: 'project',
         id: 12,
      });
   });

   it('should refuse everything outside the admin whitelist', () => {
      for (const href of [
         'https://evil.example/projects/12',
         '//evil.example/projects',
         'javascript:alert(1)',
         'data:text/html,<script>alert(1)</script>',
         '/login',
         '/projects/0',
         '/projects/12/edit',
         '/users/5',
         'projects',
         'http://[invalid',
      ]) {
         expect({ href, target: resolveAdminHref(href, ORIGIN) }).toEqual({ href, target: null });
      }
   });
});
