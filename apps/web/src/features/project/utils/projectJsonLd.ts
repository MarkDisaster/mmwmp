import type { PublicProjectEntity } from '@/api/generated/models/PublicProjectEntity';
import { resolveProjectThumbnailUrl } from '@/features/project/utils/projectThumbnail';
import { getTagName } from '@/utils/getTagName';
import { getTranslation } from '@/utils/getTranslation';
import { pageUrl, personId, websiteId } from '@/utils/jsonLd';

const projectJsonLdId = (project: PublicProjectEntity, locale: string) =>
   `${pageUrl(locale, `/projects/${project.slug}`)}#creativework`;

export function buildProjectJsonLd(project: PublicProjectEntity, locale: string) {
   const translation = getTranslation(project, locale);
   const thumbnailUrl = resolveProjectThumbnailUrl(project);
   const keywords = project.tags
      .map((pt) => getTagName(pt.tag, locale))
      .filter(Boolean)
      .join(', ');
   const url = pageUrl(locale, `/projects/${project.slug}`);

   return {
      '@type': 'CreativeWork',
      '@id': projectJsonLdId(project, locale),
      name: translation?.title ?? project.title,
      ...(translation?.description ? { description: translation.description } : {}),
      url,
      inLanguage: locale,
      ...(thumbnailUrl && /^https?:\/\//.test(thumbnailUrl) ? { image: thumbnailUrl } : {}),
      ...(project.publishedAt
         ? { datePublished: new Date(project.publishedAt).toISOString() }
         : {}),
      ...(project.updatedAt ? { dateModified: new Date(project.updatedAt).toISOString() } : {}),
      creator: { '@id': personId() },
      isPartOf: { '@id': websiteId() },
      ...(keywords ? { keywords } : {}),
   };
}
