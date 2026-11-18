import { describe, expect, it } from 'vitest';

import { getLoginSearch, getLoginSearchAfterSessionEnd, getSafeRedirect } from '../utils/redirect';

describe('getSafeRedirect', () => {
   it('should keep a relative href with its search and hash', () => {
      expect(getSafeRedirect('/projects/12')).toBe('/projects/12');
      expect(getSafeRedirect('/projects?page=2&search=a%20b#top')).toBe(
         '/projects?page=2&search=a%20b#top',
      );
   });

   it('should reject hrefs that lead to another origin', () => {
      expect(getSafeRedirect('https://evil.test/')).toBeUndefined();
      expect(getSafeRedirect('//evil.test/path')).toBeUndefined();
      expect(getSafeRedirect('/\\evil.test/path')).toBeUndefined();
      expect(getSafeRedirect('javascript:alert(1)')).toBeUndefined();
   });

   it('should reject the login page itself and values that are no href', () => {
      expect(getSafeRedirect('/login')).toBeUndefined();
      expect(getSafeRedirect('/login?redirect=%2Fprojects')).toBeUndefined();
      expect(getSafeRedirect('projects')).toBeUndefined();
      expect(getSafeRedirect(42)).toBeUndefined();
      expect(getSafeRedirect(undefined)).toBeUndefined();
   });
});

describe('getLoginSearch', () => {
   it('should remember the page to return to', () => {
      expect(getLoginSearch('/tags/3')).toEqual({ redirect: '/tags/3' });
   });

   it('should leave out the dashboard and unsafe hrefs', () => {
      expect(getLoginSearch('/')).toEqual({});
      expect(getLoginSearch('//evil.test')).toEqual({ redirect: undefined });
   });
});

describe('getLoginSearchAfterSessionEnd', () => {
   it('should start over at the dashboard after the user signed out', () => {
      expect(getLoginSearchAfterSessionEnd('/users/12', 'logout')).toEqual({});
   });

   it('should bring the user back to the page when the session ended without them', () => {
      expect(getLoginSearchAfterSessionEnd('/users/12', 'ended')).toEqual({
         redirect: '/users/12',
      });
      expect(getLoginSearchAfterSessionEnd('/users/12', null)).toEqual({ redirect: '/users/12' });
   });
});
