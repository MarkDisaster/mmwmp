import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { JsonLd } from '@/components/common/JsonLd';
import { PrivacySection } from '@/features/privacy/components/PrivacySection';
import { buildBreadcrumbJsonLd, buildJsonLdGraph } from '@/utils/jsonLd';
import { buildPageMetadata, SITE_NAME } from '@/utils/seo';

type PrivacyPageProps = {
   params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
   const { locale } = await params;
   const t = await getTranslations({ locale, namespace: 'Privacy' });

   return {
      ...buildPageMetadata({
         locale,
         path: '/privacy',
         title: { absolute: t('metaTitle') },
         description: t('metaDescription'),
      }),
      robots: { index: false, follow: true },
   };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
   const { locale } = await params;
   setRequestLocale(locale);

   const t = await getTranslations({ locale, namespace: 'Privacy' });

   return (
      <>
         <JsonLd
            data={buildJsonLdGraph(
               buildBreadcrumbJsonLd(locale, [
                  { name: SITE_NAME, path: '' },
                  { name: t('title'), path: '/privacy' },
               ]),
            )}
         />
         <PrivacySection />
      </>
   );
}
