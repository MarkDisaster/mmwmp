import { cn } from '@mm/utils/cn';
import Image from 'next/image';

import { Badge } from '@/components/common/Badge';
import type { ProjectCardData } from '@/features/project/utils/projectCard';
import { Link } from '@/i18n/navigation';

type ProjectCardProps = {
   project: ProjectCardData;
   index: number;
};

export function ProjectCard({ project, index }: ProjectCardProps) {
   const isEven = index % 2 === 0;

   return (
      <Link
         href={`/projects/${project.slug}`}
         className="group text-foreground no-underline transition-colors duration-400 hover:text-brand hover:no-underline"
      >
         <article className="flex h-fit w-full flex-col gap-8 md:flex-row md:items-center md:gap-12.5">
            <div className={cn('w-full md:w-[58%]', isEven ? 'md:order-1' : 'md:order-2')}>
               <div className="relative aspect-11/5 w-full overflow-hidden bg-muted">
                  {project.thumbnail && (
                     <Image
                        src={project.thumbnail.url}
                        alt={project.thumbnail.alt}
                        fill
                        className="object-cover brightness-90 contrast-125 grayscale duration-400 group-hover:brightness-100 group-hover:contrast-100 group-hover:grayscale-0"
                        sizes="(min-width: 1200px) 640px, (min-width: 768px) calc(58vw - 58px), calc(100vw - 50px)"
                     />
                  )}
               </div>
            </div>

            <div
               className={cn(
                  'flex w-full flex-col md:w-[42%]',
                  isEven ? 'md:order-2' : 'md:order-1',
               )}
            >
               <div className="flex flex-col gap-2 md:gap-4">
                  {project.years && (
                     <p className="mb-1 font-heading text-heading font-semibold md:mb-3 md:text-title">
                        <time dateTime={String(project.years.from)}>{project.years.from}</time>
                        {project.years.to !== null && (
                           <>
                              –<time dateTime={String(project.years.to)}>{project.years.to}</time>
                           </>
                        )}
                     </p>
                  )}
                  <h2 className="text-heading font-bold">{project.title}</h2>
                  {project.tags.length > 0 && (
                     <div className="mt-5 flex w-full flex-wrap justify-start gap-2">
                        {project.tags.map((tag) => (
                           <Badge key={tag.id}>{tag.name}</Badge>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </article>
      </Link>
   );
}
