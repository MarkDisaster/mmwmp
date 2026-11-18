import { cn } from '@mm/utils/cn';
import { Link } from '@tanstack/react-router';
import { FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { ProjectEntity } from '@/api/generated';
import { LanguageBadge } from '@/components/common/LanguageBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card } from '@/components/ui/card';
import { getThumbnailUrl } from '@/utils/file';
import { PREVIEW_CARD_INTERACTIVE_CLASS } from '@/utils/previewCard';
import { getTranslationTitle } from '@/utils/translation';
import { getAuthorLabel } from '@/utils/user';

type ProjectCardProps = {
   project: ProjectEntity;
};

export const ProjectCard = ({ project }: ProjectCardProps) => {
   const { t, i18n } = useTranslation();
   const title = getTranslationTitle(project, i18n.language);
   const thumbUrl = project.thumbnail ? getThumbnailUrl(project.thumbnail) : null;
   const authorName = project.createdBy ? getAuthorLabel(project.createdBy) : null;
   const mainLinkUrl = project.links[0]?.url;

   return (
      <Link to="/projects/$projectId" params={{ projectId: project.id }} className="block">
         <Card className={cn('group', PREVIEW_CARD_INTERACTIVE_CLASS)}>
            <div className="flex aspect-5/3 items-center justify-center overflow-hidden bg-muted">
               {thumbUrl ? (
                  <img src={thumbUrl} alt={title} className="h-full w-full object-cover" />
               ) : (
                  <FolderOpen className="h-10 w-10 text-muted-foreground" />
               )}
            </div>
            <div className="space-y-1.5 px-3 py-2">
               <p className="truncate text-sm font-medium">{title}</p>
               <div className="flex items-center gap-1.5">
                  <StatusBadge
                     status={project.status}
                     label={t(`projects.status.${project.status}`)}
                  />
                  {project.translations.map((translation) => (
                     <LanguageBadge key={translation.language} language={translation.language} />
                  ))}
               </div>
               {(authorName || mainLinkUrl) && (
                  <p className="truncate text-xs text-muted-foreground">
                     {authorName ?? mainLinkUrl}
                  </p>
               )}
            </div>
         </Card>
      </Link>
   );
};
