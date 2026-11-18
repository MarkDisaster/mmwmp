import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { env } from '@/env';
import { routing } from '@/i18n/routing';
import { TITLE_TEMPLATE, TWITTER_METADATA } from '@/utils/seo';

import { AppShell } from '../AppShell';

type LocaleLayoutProps = Readonly<{
   children: ReactNode;
   params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
   return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
   const { locale } = await params;
   const t = await getTranslations({
      locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
      namespace: 'HomePage',
   });

   return {
      metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
      title: {
         template: TITLE_TEMPLATE,
         default: t('title'),
      },
      description: t('siteDescription'),
      icons: {
         icon: [
            { url: '/favicon.ico', sizes: 'any' },
            { url: '/icon.svg', type: 'image/svg+xml' },
         ],
         apple: '/apple-icon.png',
      },
      twitter: TWITTER_METADATA,
      robots: {
         index: env.ROBOTS_NOINDEX !== 'true',
         follow: env.ROBOTS_NOINDEX !== 'true',
      },
   };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
   const { locale } = await params;

   if (!hasLocale(routing.locales, locale)) {
      notFound();
   }

   setRequestLocale(locale);

   return <AppShell locale={locale}>{children}</AppShell>;
}
