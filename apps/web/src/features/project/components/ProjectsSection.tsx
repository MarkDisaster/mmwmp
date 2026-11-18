import { useTranslations } from 'next-intl';

import { ForwardLink } from '@/components/common/ForwardLink';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ProjectList } from '@/features/project/components/ProjectList';
import type { ProjectCardData } from '@/features/project/utils/projectCard';

type ProjectsSectionProps = {
   projects: ProjectCardData[];
};

export function ProjectsSection({ projects }: ProjectsSectionProps) {
   const t = useTranslations('Projects');

   if (projects.length === 0) return null;

   return (
      <section id="projects" className="relative z-10 mb-75 w-full scroll-mt-37.5 px-6.25">
         <SectionHeader href="/projects" title={t('title')} />

         <ProjectList projects={projects} />

         <div className="pt-25">
            <ForwardLink href="/projects">{t('allProjects')}</ForwardLink>
         </div>
      </section>
   );
}
