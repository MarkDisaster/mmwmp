import { describe, expect, it, vi } from 'vitest';

import type { PublicContactEntity } from '@/api/generated/models/PublicContactEntity';

import {
   buildBreadcrumbJsonLd,
   buildJsonLdGraph,
   buildPersonJsonLd,
   buildProfilePageJsonLd,
   buildWebSiteJsonLd,
   pageUrl,
   personId,
   websiteId,
} from '../jsonLd';
import { SOCIAL_PROFILE_URLS } from '../socialProfiles';

vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_SITE_URL: 'https://marek.media' } }));

const NAME = 'Marek Marek';

const SITE = 'https://marek.media';
const PERSON_ID = `${SITE}/#person`;
const WEBSITE_ID = `${SITE}/#website`;

const contact = (fields: Partial<PublicContactEntity>) =>
   ({ id: 1, vatPayer: false, translations: [], ...fields }) as PublicContactEntity;

const collectRefs = (value: unknown, out: string[] = []): string[] => {
   if (Array.isArray(value)) value.forEach((v) => collectRefs(v, out));
   else if (value && typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 1 && entries[0]?.[0] === '@id') out.push(String(entries[0][1]));
      else entries.forEach(([, v]) => collectRefs(v, out));
   }
   return out;
};

describe('stable @ids', () => {
   it('are built from the site url, without a locale', () => {
      expect(personId()).toBe(PERSON_ID);
      expect(websiteId()).toBe(WEBSITE_ID);
      expect(pageUrl('cs', '/about')).toBe('https://marek.media/cs/about');
      expect(pageUrl('en')).toBe('https://marek.media/en');
   });
});

describe('buildWebSiteJsonLd', () => {
   it('is published and authored by the person and lists every locale', () => {
      expect(buildWebSiteJsonLd({ description: 'Portfolio' })).toEqual({
         '@type': 'WebSite',
         '@id': WEBSITE_ID,
         name: NAME,
         url: SITE,
         description: 'Portfolio',
         inLanguage: ['cs', 'en'],
         publisher: { '@id': PERSON_ID },
         author: { '@id': PERSON_ID },
      });
   });

   it('leaves out the description a page does not have', () => {
      expect(buildWebSiteJsonLd()).not.toHaveProperty('description');
   });
});

describe('buildPersonJsonLd', () => {
   it('has the stable id', () => {
      expect(buildPersonJsonLd()).toMatchObject({
         '@type': 'Person',
         '@id': PERSON_ID,
      });
   });

   it('links the social profiles', () => {
      expect(buildPersonJsonLd().sameAs).toEqual([
         SOCIAL_PROFILE_URLS.github,
         SOCIAL_PROFILE_URLS.linkedin,
      ]);
   });

   it('takes the email and the city from the CMS contact', () => {
      expect(
         buildPersonJsonLd({ contact: contact({ email: 'a@example.com', city: 'Praha' }) }),
      ).toMatchObject({
         email: 'a@example.com',
         address: { '@type': 'PostalAddress', addressLocality: 'Praha', addressCountry: 'CZ' },
      });
   });

   it('leaves out the email and the address the contact does not fill in', () => {
      const person = buildPersonJsonLd({ contact: contact({ email: null, city: '' }) });

      expect(person).not.toHaveProperty('email');
      expect(person).not.toHaveProperty('address');
   });

   it('adds the fields of the page without the contact itself', () => {
      const person = buildPersonJsonLd({
         description: 'Developer',
         knowsAbout: ['React'],
         contact: null,
      });

      expect(person).toMatchObject({ description: 'Developer', knowsAbout: ['React'] });
      expect(person).not.toHaveProperty('contact');
   });
});

describe('buildProfilePageJsonLd', () => {
   it('has the person as its main entity, in the locale of the page', () => {
      expect(
         buildProfilePageJsonLd({ locale: 'en', path: '/about', name: 'About me' }),
      ).toMatchObject({
         '@type': 'ProfilePage',
         '@id': 'https://marek.media/en/about#profilepage',
         url: 'https://marek.media/en/about',
         inLanguage: 'en',
         mainEntity: { '@id': PERSON_ID },
         isPartOf: { '@id': WEBSITE_ID },
         breadcrumb: { '@id': 'https://marek.media/en/about#breadcrumb' },
      });
   });
});

describe('buildBreadcrumbJsonLd', () => {
   const breadcrumb = buildBreadcrumbJsonLd('cs', [
      { name: NAME, path: '' },
      { name: 'Projekty', path: '/projects' },
      { name: 'Vinisto', path: '/projects/vinisto' },
   ]);

   it('numbers the items from 1 with absolute urls in the locale', () => {
      expect(breadcrumb['@id']).toBe('https://marek.media/cs/projects/vinisto#breadcrumb');
      expect(breadcrumb.itemListElement).toEqual([
         { '@type': 'ListItem', position: 1, name: NAME, item: 'https://marek.media/cs' },
         {
            '@type': 'ListItem',
            position: 2,
            name: 'Projekty',
            item: 'https://marek.media/cs/projects',
         },
         {
            '@type': 'ListItem',
            position: 3,
            name: 'Vinisto',
            item: 'https://marek.media/cs/projects/vinisto',
         },
      ]);
   });
});

describe('buildJsonLdGraph', () => {
   it('wraps the nodes and every @id reference resolves inside the graph', () => {
      const graph = buildJsonLdGraph(
         buildWebSiteJsonLd(),
         buildPersonJsonLd(),
         buildProfilePageJsonLd({ locale: 'cs', path: '/about', name: 'O mně' }),
         buildBreadcrumbJsonLd('cs', [
            { name: NAME, path: '' },
            { name: 'O mně', path: '/about' },
         ]),
      );
      const ids = graph['@graph'].map((node) => node['@id']);

      expect(graph['@context']).toBe('https://schema.org');
      expect(new Set(ids).size).toBe(ids.length);
      collectRefs(graph['@graph']).forEach((ref) => expect(ids).toContain(ref));
   });

   it('has no relative url', () => {
      const urls = JSON.stringify(
         buildJsonLdGraph(
            buildWebSiteJsonLd(),
            buildPersonJsonLd(),
            buildProfilePageJsonLd({ locale: 'en', path: '/about', name: 'About' }),
         ),
      ).match(/"(?:url|item|@id)":"([^"]+)"/g);

      expect(urls?.every((u) => /"https:\/\/marek\.media/.test(u))).toBe(true);
   });
});
