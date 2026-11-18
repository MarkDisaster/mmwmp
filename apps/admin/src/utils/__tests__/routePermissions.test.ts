import { isRedirect } from '@tanstack/react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { api } from '@/api';
import { ADMIN_ENTITY_ROUTES, ADMIN_PAGE_ROUTES } from '@/features/ai-chat/utils/adminNavigation';
import { ADMIN_ROLE, createRole, createUser } from '@/test/fixtures';

import { queryClient } from '../query-client';
import {
   canAccessRoute,
   canCurrentUserAccessRoute,
   getRoutePermission,
   isGuardedRoute,
   requireRoutePermission,
} from '../routePermissions';

const EDITOR = createRole(['projects.read', 'projects.update']);

const signIn = (role = EDITOR) =>
   queryClient.setQueryData(api.users.queries.me.queryKey, createUser(role));

afterEach(() => {
   queryClient.clear();
});

describe('the trash route', () => {
   it('should open with the delete permission of any one resource that has a trash', () => {
      expect(isGuardedRoute('/trash')).toBe(true);
      expect(canAccessRoute(createRole(['files.delete']), '/trash')).toBe(true);
      expect(canAccessRoute(createRole(['projects.delete']), '/trash')).toBe(true);
      expect(canAccessRoute(ADMIN_ROLE, '/trash')).toBe(true);
   });

   it('should stay closed to a role that can read and edit but not delete', () => {
      expect(
         canAccessRoute(createRole(['projects.read', 'projects.update', 'files.read']), '/trash'),
      ).toBe(false);
   });
});

describe('ROUTE_PERMISSIONS', () => {
   it('should guard every admin page except the dashboard and the profile', () => {
      const unguarded = [...ADMIN_PAGE_ROUTES, ...Object.values(ADMIN_ENTITY_ROUTES)].filter(
         (route) => !isGuardedRoute(route),
      );

      expect(unguarded).toEqual(['/', '/profile']);
   });

   it('should need read for a list and a detail, create for a create page', () => {
      expect(getRoutePermission('/projects')).toEqual({ resource: 'projects', action: 'read' });
      expect(getRoutePermission('/projects/$projectId')).toEqual({
         resource: 'projects',
         action: 'read',
      });
      expect(getRoutePermission('/services/new')).toEqual({
         resource: 'services',
         action: 'create',
      });
      expect(getRoutePermission('/audit')).toEqual({ resource: 'audit_logs', action: 'read' });
   });

   it('should not treat inherited object keys as routes', () => {
      expect(getRoutePermission('toString')).toBeUndefined();
   });
});

describe('canAccessRoute', () => {
   it('should open the routes the role may read', () => {
      expect(canAccessRoute(EDITOR, '/projects')).toBe(true);
      expect(canAccessRoute(EDITOR, '/projects/$projectId')).toBe(true);
      expect(canAccessRoute(EDITOR, '/')).toBe(true);
      expect(canAccessRoute(EDITOR, '/profile')).toBe(true);
   });

   it('should refuse the routes the role lacks the permission for', () => {
      expect(canAccessRoute(EDITOR, '/projects/create')).toBe(false);
      expect(canAccessRoute(EDITOR, '/users')).toBe(false);
      expect(canAccessRoute(EDITOR, '/audit')).toBe(false);
   });

   it('should open everything to the admin role', () => {
      expect(canAccessRoute(ADMIN_ROLE, '/roles/create')).toBe(true);
   });
});

describe('canCurrentUserAccessRoute', () => {
   it('should refuse a guarded route until the user is loaded', () => {
      expect(canCurrentUserAccessRoute('/projects')).toBe(false);
   });

   it('should decide by the role of the loaded user', () => {
      signIn();

      expect(canCurrentUserAccessRoute('/projects')).toBe(true);
      expect(canCurrentUserAccessRoute('/users')).toBe(false);
   });
});

describe('requireRoutePermission', () => {
   it('should let a role with the permission in', async () => {
      signIn();

      await expect(requireRoutePermission('/projects')()).resolves.toBeUndefined();
   });

   it('should send a role without the permission to the dashboard', async () => {
      signIn();

      const error: unknown = await requireRoutePermission('/users')().catch((e: unknown) => e);

      expect(isRedirect(error)).toBe(true);
      expect(isRedirect(error) && error.options).toMatchObject({ to: '/', replace: true });
   });
});
