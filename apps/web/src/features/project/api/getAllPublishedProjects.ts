import { projectPublicControllerFindAllPublished } from '@/api/generated/clients/projectPublicControllerFindAllPublished';
import type { PublicProjectEntity } from '@/api/generated/models/PublicProjectEntity';
import { PROJECTS_MAX_LIMIT } from '@/features/project/constants';

export const getAllPublishedProjects = async (): Promise<PublicProjectEntity[]> => {
   const projects = new Map<number, PublicProjectEntity>();
   let fetched = 0;

   for (let page = 0; ; page++) {
      const { data } = await projectPublicControllerFindAllPublished({
         page,
         limit: PROJECTS_MAX_LIMIT,
      });
      const batch = data?.data ?? [];
      fetched += batch.length;

      for (const project of batch) projects.set(project.id, project);

      if (batch.length === 0 || fetched >= (data?.totalCount ?? 0)) return [...projects.values()];
   }
};
