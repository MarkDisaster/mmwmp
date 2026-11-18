import type { PublicContactEntity } from '@/api/generated/models/PublicContactEntity';
import { env } from '@/env';
import { routing } from '@/i18n/routing';
import { SITE_NAME } from '@/utils/seo';
import { SOCIAL_PROFILE_URLS } from '@/utils/socialProfiles';

type JsonLdNode = { '@type': string; '@id'?: string } & Record<string, unknown>;

export const personId = () => `${env.NEXT_PUBLIC_SITE_URL}/#person`;

export const websiteId = () => `${env.NEXT_PUBLIC_SITE_URL}/#website`;

export const pageUrl = (locale: string, path = '') =>
   `${env.NEXT_PUBLIC_SITE_URL}/${locale}${path}`;

export function buildJsonLdGraph(...nodes: JsonLdNode[]) {
   return { '@context': 'https://schema.org', '@graph': nodes };
}

type WebSiteJsonLdExtra = {
   description?: string;
};

export function buildWebSiteJsonLd({ description }: WebSiteJsonLdExtra = {}): JsonLdNode {
   return {
      '@type': 'WebSite',
      '@id': websiteId(),
      name: SITE_NAME,
      url: env.NEXT_PUBLIC_SITE_URL,
      ...(description ? { description } : {}),
      inLanguage: [...routing.locales],
      publisher: { '@id': personId() },
      author: { '@id': personId() },
   };
}

type PersonJsonLdExtra = {
   description?: string;
   knowsAbout?: string[];
   contact?: PublicContactEntity | null;
};

export function buildPersonJsonLd({ contact, ...extra }: PersonJsonLdExtra = {}): JsonLdNode {
   return {
      '@type': 'Person',
      '@id': personId(),
      name: SITE_NAME,
      url: env.NEXT_PUBLIC_SITE_URL,
      sameAs: Object.values(SOCIAL_PROFILE_URLS),
      jobTitle: 'Software Developer',
      ...(contact?.email ? { email: contact.email } : {}),
      ...(contact?.city
         ? {
              address: {
                 '@type': 'PostalAddress',
                 addressLocality: contact.city,
                 addressCountry: 'CZ',
              },
           }
         : {}),
      ...extra,
   };
}

type ProfilePageJsonLdInput = {
   locale: string;
   path: string;
   name: string;
   description?: string;
};

export function buildProfilePageJsonLd({
   locale,
   path,
   name,
   description,
}: ProfilePageJsonLdInput): JsonLdNode {
   const url = pageUrl(locale, path);

   return {
      '@type': 'ProfilePage',
      '@id': `${url}#profilepage`,
      url,
      name,
      ...(description ? { description } : {}),
      inLanguage: locale,
      isPartOf: { '@id': websiteId() },
      breadcrumb: { '@id': breadcrumbId(locale, path) },
      mainEntity: { '@id': personId() },
   };
}

type BreadcrumbItem = {
   name: string;
   path: string;
};

const breadcrumbId = (locale: string, path: string) => `${pageUrl(locale, path)}#breadcrumb`;

export function buildBreadcrumbJsonLd(locale: string, items: BreadcrumbItem[]): JsonLdNode {
   const current = items[items.length - 1];

   return {
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId(locale, current?.path ?? ''),
      itemListElement: items.map((item, index) => ({
         '@type': 'ListItem',
         position: index + 1,
         name: item.name,
         item: pageUrl(locale, item.path),
      })),
   };
}
