import type { ProjectEntity } from '@/api/generated';
import { SortableCard, SortableCardGrid } from '@/components/common/SortableCardGrid';
import { CardGrid } from '@/features/layout/components/CardGrid';
import type { DataTableReorder } from '@/utils/reorder';

import { ProjectCard } from './ProjectCard';

type ProjectCardGridProps = {
   projects: ProjectEntity[];
   reorder?: DataTableReorder;
};

export const ProjectCardGrid = ({ projects, reorder }: ProjectCardGridProps) => {
   if (!reorder) {
      return (
         <CardGrid>
            {projects.map((project) => (
               <ProjectCard key={project.id} project={project} />
            ))}
         </CardGrid>
      );
   }

   return (
      <SortableCardGrid ids={projects.map((project) => String(project.id))} reorder={reorder}>
         {projects.map((project) => (
            <SortableCard
               key={project.id}
               id={String(project.id)}
               disabled={reorder.disabled || reorder.isRowDisabled?.(String(project.id))}
            >
               <ProjectCard project={project} />
            </SortableCard>
         ))}
      </SortableCardGrid>
   );
};
