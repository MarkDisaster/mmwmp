import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Locale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { JsonLd } from '@/components/common/JsonLd';
import { getContact } from '@/features/contact/api/getContact';
import { ContactDetailSection } from '@/features/contact/components/ContactDetailSection';
import { getPageLocalesSafe } from '@/features/locale-content/api/getLocaleContent';
import { buildBreadcrumbJsonLd, buildJsonLdGraph } from '@/utils/jsonLd';
import { buildPageMetadata, SITE_NAME } from '@/utils/seo';

type ContactPageProps = {
   params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
   const { locale } = await params;
   const t = await getTranslations({ locale, namespace: 'Contact' });
   return buildPageMetadata({
      locale,
      path: '/contact',
      title: { absolute: t('metaTitle') },
      description: t('metaDescription'),
      locales: await getPageLocalesSafe('contact'),
   });
}

export default async function ContactPage({ params }: ContactPageProps) {
   const { locale } = await params;
   setRequestLocale(locale);

   const [contact, t] = await Promise.all([
      getContact(),
      getTranslations({ locale, namespace: 'Header' }),
   ]);

   if (!contact) notFound();

   return (
      <>
         <JsonLd
            data={buildJsonLdGraph(
               buildBreadcrumbJsonLd(locale, [
                  { name: SITE_NAME, path: '' },
                  { name: t('contact'), path: '/contact' },
               ]),
            )}
         />
         <ContactDetailSection contact={contact} />
      </>
   );
}
