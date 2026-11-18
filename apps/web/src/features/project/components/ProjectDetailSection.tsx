import { cn } from '@mm/utils/cn';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type { PublicProjectEntity } from '@/api/generated/models/PublicProjectEntity';
import { BackLink } from '@/components/common/BackLink';
import { Badge } from '@/components/common/Badge';
import { PreviewBanner } from '@/components/common/PreviewBanner';
import { RichText } from '@/components/common/rich-text/RichText';
import { DetailPageGrid } from '@/components/layout/DetailPageGrid';
import { ProjectMedia } from '@/features/project/components/ProjectMedia';
import { formatProjectLinkLabel } from '@/features/project/utils/formatProjectLinkLabel';
import { formatProjectYears, getProjectYears } from '@/features/project/utils/projectYears';
import { getTagName } from '@/utils/getTagName';
import { getTranslation } from '@/utils/getTranslation';

const FACT_LABEL_CLASS = 'text-muted-foreground text-sm font-semibold uppercase';

type SidebarItemProps = {
   label: string;
   children: ReactNode;
   className?: string;
};

function SidebarItem({ label, children, className }: SidebarItemProps) {
   return (
      <div>
         <dt className={FACT_LABEL_CLASS}>{label}</dt>
         <dd className={cn('font-semibold', className)}>{children}</dd>
      </div>
   );
}

type ProjectDetailSectionProps = {
   project: PublicProjectEntity;
   isPreview: boolean;
};

export function ProjectDetailSection({ project, isPreview }: ProjectDetailSectionProps) {
   const t = useTranslations('Projects');
   const locale = useLocale();
   const translation = getTranslation(project, locale);

   if (!translation) return null;

   const facts = [
      { label: t('role'), value: translation.role },
      {
         label: t('period'),
         value: ((years) => (years ? formatProjectYears(years) : null))(getProjectYears(project)),
      },
      { label: t('company'), value: project.company },
   ].filter((fact): fact is { label: string; value: string } => !!fact.value);
   const links = project.links;
   const tagNames = project.tags
      .map((pt) => ({ id: pt.tagId, name: getTagName(pt.tag, locale) }))
      .filter((tag) => tag.name !== '');
   const hasTags = tagNames.length > 0;
   const hasSidebar = facts.length > 0 || hasTags || links.length > 0;

   return (
      <>
         {isPreview && <PreviewBanner />}

         <section className="relative z-10 mb-75 w-full px-6.25">
            <BackLink href="/projects">{t('backToProjects')}</BackLink>

            <DetailPageGrid
               columns={hasSidebar}
               className={hasSidebar ? 'lg:grid-rows-[auto_1fr]' : undefined}
            >
               <h1 className="wrap-anywhere lg:col-start-1 lg:row-start-1">{translation.title}</h1>

               {hasSidebar && (
                  <aside className="flex flex-col gap-5 lg:sticky lg:top-37.5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
                     <dl className="flex flex-col gap-8">
                        {facts.map((fact) => (
                           <SidebarItem key={fact.label} label={fact.label}>
                              {fact.value}
                           </SidebarItem>
                        ))}
                        {links.length > 0 && (
                           <SidebarItem label={t('links')}>
                              <ul className="flex flex-col gap-1">
                                 {links.map((link, index) => (
                                    <li key={`${index}-${link.url}`}>
                                       <a href={link.url} target="_blank" rel="noopener noreferrer">
                                          {formatProjectLinkLabel(link)}
                                       </a>
                                    </li>
                                 ))}
                              </ul>
                           </SidebarItem>
                        )}
                     </dl>
                     {hasTags && (
                        <ul aria-label={t('stack')} className="flex flex-wrap gap-2 pt-3">
                           {tagNames.map((tag) => (
                              <li key={tag.id}>
                                 <Badge>{tag.name}</Badge>
                              </li>
                           ))}
                        </ul>
                     )}
                  </aside>
               )}

               <div className="lg:col-start-1 lg:row-start-2">
                  {translation.description && (
                     <p className="pb-12.5 text-lg font-semibold">{translation.description}</p>
                  )}

                  {translation.content && <RichText html={translation.content} />}

                  <ProjectMedia media={project.media} locale={locale} />
               </div>
            </DetailPageGrid>
         </section>
      </>
   );
}
