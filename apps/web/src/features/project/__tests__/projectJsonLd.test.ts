import { describe, expect, it, vi } from 'vitest';

import type { PublicProjectEntity } from '@/api/generated/models/PublicProjectEntity';
import { buildBreadcrumbJsonLd, buildJsonLdGraph, buildPersonJsonLd } from '@/utils/jsonLd';

import { buildProjectJsonLd } from '../utils/projectJsonLd';

vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_SITE_URL: 'https://marek.media' } }));

const project = (fields: Partial<PublicProjectEntity> = {}) =>
   ({
      slug: 'sample',
      title: 'Sample',
      translations: [{ language: 'en', title: 'Sample', description: null }],
      tags: [],
      links: [{ id: 1, projectId: 1, label: null, url: 'https://live.example.com', sortOrder: 0 }],
      thumbnail: null,
      publishedAt: null,
      updatedAt: '2026-11-06T10:00:00.000Z',
      ...fields,
   }) as unknown as PublicProjectEntity;

const withImage = (publicUrl: string) =>
   project({ thumbnail: { variants: [{ variant: 'large', publicUrl }] } } as never);

describe('buildProjectJsonLd', () => {
   it('points the url at the project page of this site, never at the client site', () => {
      const jsonLd = buildProjectJsonLd(project(), 'en');

      expect(jsonLd.url).toBe('https://marek.media/en/projects/sample');
      expect(JSON.stringify(jsonLd)).not.toContain('live.example.com');
   });

   it('uses the locale in the url and in inLanguage', () => {
      expect(buildProjectJsonLd(project(), 'cs')).toMatchObject({
         url: 'https://marek.media/cs/projects/sample',
         inLanguage: 'cs',
         '@id': 'https://marek.media/cs/projects/sample#creativework',
      });
   });

   it('references the person as the creator and the site as its parent', () => {
      expect(buildProjectJsonLd(project(), 'en')).toMatchObject({
         creator: { '@id': 'https://marek.media/#person' },
         isPartOf: { '@id': 'https://marek.media/#website' },
      });
   });

   it('adds the dates only when the API has them', () => {
      const without = buildProjectJsonLd(project(), 'en');
      const withDate = buildProjectJsonLd(
         project({ publishedAt: '2026-01-02T00:00:00.000Z' }),
         'en',
      );

      expect(without).not.toHaveProperty('datePublished');
      expect(without.dateModified).toBe('2026-11-06T10:00:00.000Z');
      expect(withDate.datePublished).toBe('2026-01-02T00:00:00.000Z');
   });

   it('adds the image only when its url is absolute', () => {
      expect(buildProjectJsonLd(project(), 'en')).not.toHaveProperty('image');
      expect(buildProjectJsonLd(withImage('/media/a.png'), 'en')).not.toHaveProperty('image');
      expect(buildProjectJsonLd(withImage('https://cdn.example.com/a.png'), 'en').image).toBe(
         'https://cdn.example.com/a.png',
      );
   });

   it('lists the tag names of the locale as keywords, Czech where there is no translation', () => {
      const tags = [
         {
            tag: {
               translations: [
                  { language: 'cs', name: 'Případová studie' },
                  { language: 'en', name: 'Case study' },
               ],
            },
         },
         { tag: { translations: [{ language: 'cs', name: 'Návrh' }] } },
      ] as never;

      expect(buildProjectJsonLd(project({ tags }), 'en').keywords).toBe('Case study, Návrh');
      expect(buildProjectJsonLd(project({ tags }), 'cs').keywords).toBe('Případová studie, Návrh');
   });

   it('leaves out empty keywords and description', () => {
      const jsonLd = buildProjectJsonLd(project(), 'en');

      expect(jsonLd).not.toHaveProperty('keywords');
      expect(jsonLd).not.toHaveProperty('description');
   });

   it('resolves the creator inside the graph of the page', () => {
      const graph = buildJsonLdGraph(
         buildPersonJsonLd(),
         buildProjectJsonLd(project(), 'en'),
         buildBreadcrumbJsonLd('en', [
            { name: 'Marek Marek', path: '' },
            { name: 'Projects', path: '/projects' },
            { name: 'Sample', path: '/projects/sample' },
         ]),
      );

      expect(graph['@graph'].map((n) => n['@id'])).toContain('https://marek.media/#person');
   });
});
