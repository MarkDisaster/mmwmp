import type { PublicProjectEntity } from '@/api/generated/models/PublicProjectEntity';
import {
   resolveProjectThumbnailAlt,
   resolveProjectThumbnailUrl,
} from '@/features/project/utils/projectThumbnail';
import type { ProjectYears } from '@/features/project/utils/projectYears';
import { getProjectYears } from '@/features/project/utils/projectYears';
import { getTagName } from '@/utils/getTagName';
import { getTranslation } from '@/utils/getTranslation';

const CARD_TAG_LIMIT = 3;

export type ProjectCardData = {
   id: number;
   slug: string;
   title: string;
   thumbnail: { url: string; alt: string } | null;
   years: ProjectYears | null;
   tags: { id: number; name: string }[];
};

export type ProjectCardsPage = {
   projects: ProjectCardData[];
   totalCount: number;
};

export const toProjectCards = (
   projects: PublicProjectEntity[],
   locale: string,
   currentYear: number = new Date().getFullYear(),
): ProjectCardData[] =>
   projects.flatMap((project) => {
      const translation = getTranslation(project, locale);
      if (!translation) return [];

      const thumbnailUrl = resolveProjectThumbnailUrl(project);

      return [
         {
            id: project.id,
            slug: project.slug,
            title: translation.title,
            thumbnail: thumbnailUrl
               ? { url: thumbnailUrl, alt: resolveProjectThumbnailAlt(project, translation.title) }
               : null,
            years: getProjectYears(project, currentYear),
            tags: project.tags
               .map(({ tag }) => ({ id: tag.id, name: getTagName(tag, locale) }))
               .filter((tag) => tag.name !== '')
               .slice(0, CARD_TAG_LIMIT),
         },
      ];
   });
