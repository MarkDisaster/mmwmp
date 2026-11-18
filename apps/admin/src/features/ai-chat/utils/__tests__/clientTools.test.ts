import type { i18n as I18nInstance } from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
   type ClientToolDeps,
   executeClientTool,
   isClientTool,
   NAVIGATION_TIMEOUT_MS,
} from '../clientTools';

const INVALID_INPUT = 'Invalid tool input';

type RouterState = {
   location: { pathname: string; href: string };
   matches: { status: string }[];
   statusCode: number;
};

const createDeps = ({
   onNavigate = 'arrive',
}: { onNavigate?: 'arrive' | 'notFound' | 'block' } = {}) => {
   const calls: string[] = [];
   const state: RouterState = {
      location: { pathname: '/', href: '/' },
      matches: [{ status: 'success' }],
      statusCode: 200,
   };
   const buildLocation = vi.fn((options: { to: string; params?: Record<string, number> }) => ({
      pathname: options.to.replace(/\$(\w+)/, (_, key: string) => String(options.params?.[key])),
   }));
   const navigate = vi.fn((options: { to: string; params?: Record<string, number> }) => {
      calls.push('navigate');
      if (onNavigate === 'block') return new Promise<void>(() => {});
      const { pathname } = buildLocation(options);
      state.location = { pathname, href: pathname };
      if (onNavigate === 'notFound') {
         state.statusCode = 404;
         state.matches = [{ status: 'notFound' }];
      }
      return Promise.resolve();
   });
   const changeLanguage = vi.fn().mockResolvedValue(undefined);
   const setChatMode = vi.fn();
   const revealPage = vi.fn(() => calls.push('revealPage'));
   const deps = {
      i18n: { changeLanguage } as unknown as I18nInstance,
      router: { navigate, buildLocation, state } as unknown as ClientToolDeps['router'],
      setChatMode,
      revealPage,
   } satisfies ClientToolDeps;
   return { deps, calls, changeLanguage, navigate, setChatMode, revealPage };
};

afterEach(() => {
   vi.useRealTimers();
});

describe('isClientTool', () => {
   it('should recognise the client tools', () => {
      expect(isClientTool('switchLanguage')).toBe(true);
      expect(isClientTool('navigateTo')).toBe(true);
      expect(isClientTool('openEntity')).toBe(true);
      expect(isClientTool('setChatMode')).toBe(true);
   });

   it('should reject server tools and inherited object keys', () => {
      expect(isClientTool('createTag')).toBe(false);
      expect(isClientTool('toString')).toBe(false);
   });
});

describe('executeClientTool', () => {
   it('should switch the language', async () => {
      const { deps, changeLanguage } = createDeps();

      await expect(executeClientTool('switchLanguage', { language: 'en' }, deps)).resolves.toEqual({
         language: 'en',
         applied: true,
      });
      expect(changeLanguage).toHaveBeenCalledWith('en');
   });

   it('should navigate to a known page after moving the chat aside', async () => {
      const { deps, navigate, calls } = createDeps();

      await expect(executeClientTool('navigateTo', { path: '/audit' }, deps)).resolves.toEqual({
         path: '/audit',
         navigated: true,
      });
      expect(navigate).toHaveBeenCalledWith({ to: '/audit' });
      expect(calls).toEqual(['revealPage', 'navigate']);
   });

   it('should open a list with its search box filled in', async () => {
      const { deps, navigate } = createDeps();

      await executeClientTool('navigateTo', { path: '/users', search: ' jan@example.com ' }, deps);

      expect(navigate).toHaveBeenCalledWith({
         to: '/users',
         search: { search: 'jan@example.com' },
      });
   });

   it('should refuse a search on a page without a search box', async () => {
      const { deps, navigate } = createDeps();

      await expect(
         executeClientTool('navigateTo', { path: '/contact', search: 'x' }, deps),
      ).rejects.toThrow(INVALID_INPUT);
      expect(navigate).not.toHaveBeenCalled();
   });

   it('should open the detail of a record with typed params', async () => {
      const { deps, navigate, revealPage } = createDeps();

      await expect(
         executeClientTool('openEntity', { entity: 'project', id: 12 }, deps),
      ).resolves.toEqual({ entity: 'project', id: 12, path: '/projects/12', navigated: true });
      expect(navigate).toHaveBeenCalledWith({
         to: '/projects/$projectId',
         params: { projectId: 12 },
      });
      expect(revealPage).toHaveBeenCalledTimes(1);
   });

   it('should report a record that does not exist as an error', async () => {
      const { deps } = createDeps({ onNavigate: 'notFound' });

      await expect(
         executeClientTool('openEntity', { entity: 'role', id: 99 }, deps),
      ).rejects.toThrow('The role with id 99 does not exist');
   });

   it('should answer without waiting when a leave dialog holds the navigation back', async () => {
      vi.useFakeTimers();
      const { deps } = createDeps({ onNavigate: 'block' });

      const result = executeClientTool('openEntity', { entity: 'service', id: 3 }, deps);
      await vi.advanceTimersByTimeAsync(NAVIGATION_TIMEOUT_MS);

      await expect(result).resolves.toMatchObject({
         entity: 'service',
         id: 3,
         path: '/services/3',
         navigated: false,
      });
   });

   it('should set the chat mode', async () => {
      const { deps, setChatMode } = createDeps();

      await expect(executeClientTool('setChatMode', { mode: 'floating' }, deps)).resolves.toEqual({
         mode: 'floating',
         applied: true,
      });
      expect(setChatMode).toHaveBeenCalledWith('floating');
   });

   it('should refuse a route or an entity outside the whitelist without navigating', async () => {
      const { deps, navigate, revealPage } = createDeps();

      for (const [name, input] of [
         ['navigateTo', { path: '/projects/../login' }],
         ['navigateTo', { path: '/login' }],
         ['navigateTo', { path: '/projects/12' }],
         ['openEntity', { entity: 'user', id: 1 }],
         ['openEntity', { entity: 'project', id: 0 }],
         ['openEntity', { entity: 'project', id: '12' }],
      ] as const) {
         await expect(executeClientTool(name, input, deps)).rejects.toThrow(INVALID_INPUT);
      }
      expect(navigate).not.toHaveBeenCalled();
      expect(revealPage).not.toHaveBeenCalled();
   });

   it('should refuse a page or a record the role may not open without navigating', async () => {
      const { deps, navigate, revealPage } = createDeps();
      const canOpen = vi.fn((route: string) => route === '/projects');
      const withPermissions = { ...deps, canOpen };

      await expect(
         executeClientTool('navigateTo', { path: '/users' }, withPermissions),
      ).rejects.toThrow('no permission to open /users');
      await expect(
         executeClientTool('openEntity', { entity: 'role', id: 3 }, withPermissions),
      ).rejects.toThrow('no permission to open /roles/$roleId');
      expect(navigate).not.toHaveBeenCalled();
      expect(revealPage).not.toHaveBeenCalled();

      await expect(
         executeClientTool('navigateTo', { path: '/projects' }, withPermissions),
      ).resolves.toEqual({ path: '/projects', navigated: true });
      expect(canOpen).toHaveBeenLastCalledWith('/projects');
   });

   it('should refuse an invalid input without side effects', async () => {
      const { deps, changeLanguage, setChatMode } = createDeps();

      await expect(executeClientTool('switchLanguage', { language: 'de' }, deps)).rejects.toThrow(
         INVALID_INPUT,
      );
      await expect(executeClientTool('setChatMode', { mode: 'closed' }, deps)).rejects.toThrow(
         INVALID_INPUT,
      );
      await expect(executeClientTool('setChatMode', undefined, deps)).rejects.toThrow(
         INVALID_INPUT,
      );
      expect(changeLanguage).not.toHaveBeenCalled();
      expect(setChatMode).not.toHaveBeenCalled();
   });
});
