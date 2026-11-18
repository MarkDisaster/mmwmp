import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import type { Locale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { JsonLd } from '@/components/common/JsonLd';
import { PreviewBanner } from '@/components/common/PreviewBanner';
import { AboutSection } from '@/features/about/components/AboutSection';
import { getAboutContent } from '@/features/about/utils/aboutContent';
import { getContact } from '@/features/contact/api/getContact';
import { ContactSection } from '@/features/contact/components/ContactSection';
import { getPageLocalesSafe } from '@/features/locale-content/api/getLocaleContent';
import { getPreviewServices } from '@/features/service/api/getPreviewServices';
import { getServices } from '@/features/service/api/getServices';
import { getTags } from '@/features/tag/api/getTags';
import { getTagName } from '@/utils/getTagName';
import {
   buildBreadcrumbJsonLd,
   buildJsonLdGraph,
   buildPersonJsonLd,
   buildProfilePageJsonLd,
   buildWebSiteJsonLd,
} from '@/utils/jsonLd';
import { buildPageMetadata, SITE_NAME } from '@/utils/seo';

type AboutPageProps = {
   params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
   const { locale } = await params;
   const t = await getTranslations({ locale, namespace: 'Services' });

   return buildPageMetadata({
      locale,
      path: '/about',
      title: t('aboutTitle'),
      description: t('aboutDescription'),
      type: 'profile',
      locales: await getPageLocalesSafe('about'),
   });
}

export default async function AboutPage({ params }: AboutPageProps) {
   const { locale } = await params;
   setRequestLocale(locale);

   const { isEnabled: isPreview } = await draftMode();

   const [servicesResponse, contact, tagsResponse, t] = await Promise.all([
      isPreview ? getPreviewServices(locale) : getServices(locale),
      getContact(),
      getTags(),
      getTranslations({ locale, namespace: 'Services' }),
   ]);
   const services = servicesResponse?.data ?? [];
   const tags = tagsResponse?.data ?? [];
   const { title, description } = getAboutContent(contact, locale);

   return (
      <>
         {isPreview && <PreviewBanner />}
         <JsonLd
            data={buildJsonLdGraph(
               buildWebSiteJsonLd(),
               buildPersonJsonLd({
                  contact,
                  knowsAbout: tags.map((tag) => getTagName(tag, locale)).filter(Boolean),
               }),
               buildProfilePageJsonLd({
                  locale,
                  path: '/about',
                  name: t('aboutTitle'),
                  description: t('aboutDescription'),
               }),
               buildBreadcrumbJsonLd(locale, [
                  { name: SITE_NAME, path: '' },
                  { name: t('aboutTitle'), path: '/about' },
               ]),
            )}
         />
         <AboutSection
            title={title}
            description={description}
            services={services}
            tags={tags}
            variant="detail"
         />
         <ContactSection contact={contact} />
      </>
   );
}
