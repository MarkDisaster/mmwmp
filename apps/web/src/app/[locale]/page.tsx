import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { JsonLd } from '@/components/common/JsonLd';
import { AboutSection } from '@/features/about/components/AboutSection';
import { getAboutContent } from '@/features/about/utils/aboutContent';
import { getContact } from '@/features/contact/api/getContact';
import { ContactSection } from '@/features/contact/components/ContactSection';
import { HeroSection } from '@/features/home/components/HeroSection';
import { HOME_TAGS_LIMIT } from '@/features/home/constants';
import { getPageLocalesSafe } from '@/features/locale-content/api/getLocaleContent';
import { getHomepageProjects } from '@/features/project/api/getProjects';
import { ProjectsSection } from '@/features/project/components/ProjectsSection';
import { getServices } from '@/features/service/api/getServices';
import { getTags } from '@/features/tag/api/getTags';
import { buildJsonLdGraph, buildPersonJsonLd, buildWebSiteJsonLd } from '@/utils/jsonLd';
import { buildPageMetadata } from '@/utils/seo';

type HomePageProps = {
   params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
   const { locale } = await params;
   const t = await getTranslations({ locale, namespace: 'HomePage' });

   return buildPageMetadata({
      locale,
      title: { absolute: t('title') },
      description: t('metaDescription'),
      locales: await getPageLocalesSafe('home'),
   });
}

export default async function HomePage({ params }: HomePageProps) {
   const { locale } = await params;
   setRequestLocale(locale);

   const t = await getTranslations({ locale, namespace: 'HomePage' });

   const [projects, servicesResponse, tagsResponse, contact] = await Promise.all([
      getHomepageProjects(locale),
      getServices(locale, true),
      getTags().catch(() => null),
      getContact(),
   ]);
   const services = servicesResponse?.data ?? [];
   const tags = (tagsResponse?.data ?? []).slice(0, HOME_TAGS_LIMIT);

   const { title, description } = getAboutContent(contact, locale);

   return (
      <>
         <JsonLd
            data={buildJsonLdGraph(
               buildWebSiteJsonLd({ description: t('siteDescription') }),
               buildPersonJsonLd({
                  description: t('metaDescription'),
                  contact,
                  knowsAbout: ['React', 'Next.js', 'TypeScript', 'Node.js', 'UI/UX Design', 'SaaS'],
               }),
            )}
         />
         <HeroSection />
         <AboutSection
            title={title}
            description={description}
            services={services}
            tags={tags}
            variant="preview"
         />
         <ProjectsSection projects={projects} />
         <ContactSection contact={contact} />
      </>
   );
}
