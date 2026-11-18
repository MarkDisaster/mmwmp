import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { PublicServiceEntity } from '@/api/generated/models/PublicServiceEntity';

import { AboutSection } from '../components/AboutSection';

vi.mock('next-intl', () => ({
   useLocale: () => 'en',
   useTranslations: () => (key: string) => key,
}));
vi.mock('@/i18n/navigation', () => ({
   Link: ({
      href,
      className,
      children,
   }: {
      href: string;
      className?: string;
      children: ReactNode;
   }) => createElement('a', { href, className }, children),
}));

function service(id: number, slug: string, titles: Record<string, string>): PublicServiceEntity {
   return {
      id,
      title: slug,
      status: 'published',
      slug,
      sortOrder: id,
      showOnHomepage: true,
      publishedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      translations: Object.entries(titles).map(([language, title]) => ({
         id: id * 10,
         serviceId: id,
         language: language as 'cs' | 'en',
         title,
         description: `${title} text`,
      })),
      projects: [],
   };
}

function links(html: string) {
   return [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gs)].map(([, href, inner]) => ({
      href,
      text: inner.replace(/<[^>]+>/g, '').trim(),
   }));
}

describe('AboutSection', () => {
   it('renders no service link without a name for a service that has no translation', () => {
      const html = renderToStaticMarkup(
         createElement(AboutSection, {
            description: '<p>About</p>',
            services: [service(1, 'apps', { en: 'Apps' }), service(2, 'ai', {})],
            variant: 'preview',
         }),
      );

      const serviceLinks = links(html).filter(({ href }) => href.startsWith('/about#'));
      expect(serviceLinks).toEqual([{ href: '/about#apps', text: 'AppsApps text' }]);
      expect(links(html).every(({ text }) => text !== '')).toBe(true);
   });

   it('renders nothing when its only content is services without a translation', () => {
      const html = renderToStaticMarkup(
         createElement(AboutSection, {
            description: null,
            services: [service(1, 'apps', {})],
            variant: 'preview',
         }),
      );

      expect(html).toBe('');
   });
});
