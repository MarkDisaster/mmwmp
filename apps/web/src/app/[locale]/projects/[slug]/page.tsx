import { isAxiosError } from 'axios';
import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Locale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { projectPublicControllerFindBySlug } from '@/api/generated/clients/projectPublicControllerFindBySlug';
import type { PublicProjectEntity } from '@/api/generated/models/PublicProjectEntity';
import { JsonLd } from '@/components/common/JsonLd';
import { getContact } from '@/features/contact/api/getContact';
import { ContactSection } from '@/features/contact/components/ContactSection';
import { getPreviewAuthorization } from '@/features/draft-preview/utils/previewCredentials';
import { getProject } from '@/features/project/api/getProject';
import { getProjectLocales } from '@/features/project/api/getProjectLocales';
import { getProjectRedirect } from '@/features/project/api/getProjectRedirect';
import { ProjectDetailSection } from '@/features/project/components/ProjectDetailSection';
import { buildProjectJsonLd } from '@/features/project/utils/projectJsonLd';
import { projectDetailLocales } from '@/features/project/utils/projectLocales';
import { resolveProjectThumbnailUrl } from '@/features/project/utils/projectThumbnail';
import { getTranslation } from '@/utils/getTranslation';
import {
   buildBreadcrumbJsonLd,
   buildJsonLdGraph,
   buildPersonJsonLd,
   buildWebSiteJsonLd,
} from '@/utils/jsonLd';
import { buildPageMetadata, SITE_NAME } from '@/utils/seo';

type ProjectDetailPageProps = {
   params: Promise<{ slug: string; locale: Locale }>;
};

export async function generateStaticParams() {
   try {
      const projects = await getProjectLocales();

      return projects.flatMap(({ slug, locales }) => locales.map((locale) => ({ locale, slug })));
   } catch (error) {
      console.error('generateStaticParams(projects/[slug]) failed:', error);
      return [];
   }
}

const fetchProject = async (slug: string, locale: string): Promise<PublicProjectEntity | null> => {
   const { isEnabled: isPreview } = await draftMode();

   if (!isPreview) return getProject(slug, locale);

   const headers = { Authorization: getPreviewAuthorization() };
   try {
      const { data } = await projectPublicControllerFindBySlug(
         slug,
         { 'Accept-Language': locale },
         { headers },
      );
      return data;
   } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
   }
};

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
   const { slug, locale } = await params;

   const project = await fetchProject(slug, locale);
   if (!project) return { title: 'Project not found' };

   const locales = await getProjectLocales().then(
      (entries) => projectDetailLocales(entries, slug, locale),
      (error: unknown) => {
         console.error('[project metadata] Failed to load project locales:', error);
         return [locale];
      },
   );
   const translation = getTranslation(project, locale);
   const title = translation?.metaTitle || translation?.title || slug;
   const thumbnailUrl = resolveProjectThumbnailUrl(project);

   return buildPageMetadata({
      locale,
      path: `/projects/${slug}`,
      title,
      description: translation?.metaDescription || translation?.description || undefined,
      type: 'article',
      images: thumbnailUrl
         ? [
              {
                 url: thumbnailUrl,
                 width: 1200,
                 height: 630,
                 alt: project.thumbnail?.altText?.trim() || (translation?.title ?? slug),
              },
           ]
         : undefined,
      locales,
   });
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
   const { slug, locale } = await params;
   setRequestLocale(locale);
   const { isEnabled: isPreview } = await draftMode();

   const [project, contact, t] = await Promise.all([
      fetchProject(slug, locale),
      getContact(),
      getTranslations({ locale, namespace: 'Projects' }),
   ]);

   if (!project) {
      const currentSlug = isPreview ? null : await getProjectRedirect(slug);
      if (currentSlug && currentSlug !== slug) {
         permanentRedirect(`/${locale}/projects/${encodeURIComponent(currentSlug)}`);
      }
      notFound();
   }
   if (project.translations.length === 0) notFound();

   const title = getTranslation(project, locale)?.title ?? project.title;

   return (
      <>
         <JsonLd
            data={buildJsonLdGraph(
               buildWebSiteJsonLd(),
               buildPersonJsonLd({ contact }),
               buildProjectJsonLd(project, locale),
               buildBreadcrumbJsonLd(locale, [
                  { name: SITE_NAME, path: '' },
                  { name: t('title'), path: '/projects' },
                  { name: title, path: `/projects/${slug}` },
               ]),
            )}
         />
         <ProjectDetailSection project={project} isPreview={isPreview} />
         <ContactSection contact={contact} />
      </>
   );
}
