import type { ProjectCardData } from '@/features/project/utils/projectCard';

import { ProjectCard } from './ProjectCard';

type ProjectListProps = {
   projects: ProjectCardData[];
   offset?: number;
};

export function ProjectList({ projects, offset = 0 }: ProjectListProps) {
   return (
      <div className="flex flex-col gap-24 md:gap-36">
         {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={offset + index} />
         ))}
      </div>
   );
}
