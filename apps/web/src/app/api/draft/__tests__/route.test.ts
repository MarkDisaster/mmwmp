import { createHmac } from 'crypto';
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../route';

const env = vi.hoisted(() => ({}) as { PREVIEW_URL_SIGNING_KEY?: string; PREVIEW_SECRET?: string });
vi.mock('@/env', () => ({ env }));
vi.mock('next/headers', () => ({ draftMode: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const SIGNING_KEY = 'url-signing-key-of-at-least-32-characters';
const LEGACY = 'legacy-preview-secret';
const enable = vi.fn();

const sign = (payload: object, key = SIGNING_KEY) => {
   const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
   return `${body}.${createHmac('sha256', key).update(body).digest('base64url')}`;
};

const inFiveMinutes = () => Math.floor(Date.now() / 1000) + 300;

const request = (query: Record<string, string>) =>
   GET(new NextRequest(`https://web.test/api/draft?${new URLSearchParams(query)}`));

describe('GET /api/draft', () => {
   beforeEach(() => {
      vi.mocked(draftMode).mockResolvedValue({ enable } as never);
   });
   afterEach(() => {
      vi.resetAllMocks();
      delete env.PREVIEW_URL_SIGNING_KEY;
      delete env.PREVIEW_SECRET;
   });

   describe('signed token', () => {
      beforeEach(() => {
         env.PREVIEW_URL_SIGNING_KEY = SIGNING_KEY;
      });

      it.each([
         ['projects', '/en/projects/my-project'],
         ['services', '/en/about#my-project'],
      ])('enables draft mode and opens the %s draft of the token', async (resource, path) => {
         const token = sign({
            resource,
            id: 7,
            slug: 'my-project',
            locale: 'en',
            exp: inFiveMinutes(),
         });

         await request({ token });

         expect(enable).toHaveBeenCalledOnce();
         expect(redirect).toHaveBeenCalledWith(path);
      });

      it('opens the default language for an unknown locale', async () => {
         const token = sign({
            resource: 'projects',
            id: 7,
            slug: 'x',
            locale: 'de',
            exp: inFiveMinutes(),
         });

         await request({ token });

         expect(redirect).toHaveBeenCalledWith('/cs/projects/x');
      });

      it('ignores slug, type and locale next to the token', async () => {
         const token = sign({
            resource: 'projects',
            id: 7,
            slug: 'x',
            locale: 'en',
            exp: inFiveMinutes(),
         });

         await request({ token, slug: 'other', type: 'services', locale: 'cs' });

         expect(redirect).toHaveBeenCalledWith('/en/projects/x');
      });

      it.each([
         [
            'an expired token',
            sign({ resource: 'projects', id: 7, slug: 'x', locale: 'en', exp: 1 }),
         ],
         [
            'a token signed with another key',
            sign(
               { resource: 'projects', id: 7, slug: 'x', locale: 'en', exp: inFiveMinutes() },
               `${SIGNING_KEY}x`,
            ),
         ],
         ['the legacy secret in place of a token', LEGACY],
      ])('answers 401 to %s without enabling draft mode', async (_case, token) => {
         const response = await request({ token });

         expect(response?.status).toBe(401);
         expect(response?.headers.get('Cache-Control')).toBe('no-store');
         expect(enable).not.toHaveBeenCalled();
         expect(redirect).not.toHaveBeenCalled();
      });

      it('refuses a legacy ?secret= link once PREVIEW_SECRET is unset', async () => {
         const response = await request({ secret: LEGACY, slug: 'x', type: 'projects' });

         expect(response?.status).toBe(401);
         expect(enable).not.toHaveBeenCalled();
      });
   });

   it('refuses every token without PREVIEW_URL_SIGNING_KEY', async () => {
      env.PREVIEW_SECRET = LEGACY;
      const token = sign({
         resource: 'projects',
         id: 7,
         slug: 'x',
         locale: 'en',
         exp: inFiveMinutes(),
      });

      const response = await request({ token });

      expect(response?.status).toBe(401);
      expect(enable).not.toHaveBeenCalled();
   });

   describe('legacy ?secret= link (fallback while PREVIEW_SECRET is set)', () => {
      beforeEach(() => {
         env.PREVIEW_SECRET = LEGACY;
      });

      it('opens the draft as before', async () => {
         await request({ secret: LEGACY, slug: 'my-service', type: 'services', locale: 'en' });

         expect(enable).toHaveBeenCalledOnce();
         expect(redirect).toHaveBeenCalledWith('/en/about#my-service');
      });

      it('is still accepted next to the signing key during the switch', async () => {
         env.PREVIEW_URL_SIGNING_KEY = SIGNING_KEY;

         await request({ secret: LEGACY, slug: 'x' });

         expect(redirect).toHaveBeenCalledWith('/cs/projects/x');
      });

      it('answers 401 to a wrong secret and 400 to missing parameters', async () => {
         expect((await request({ secret: 'wrong', slug: 'x' }))?.status).toBe(401);
         expect((await request({ secret: LEGACY }))?.status).toBe(400);
         expect((await request({ secret: LEGACY, slug: 'x', type: 'users' }))?.status).toBe(400);
         expect(enable).not.toHaveBeenCalled();
      });
   });
});
