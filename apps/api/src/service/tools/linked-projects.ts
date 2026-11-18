type LinkedProject = {
   project: { id: number; slug: string; translations: ReadonlyArray<{ title: string }> };
};

export const toLinkedProjects = (projects: readonly LinkedProject[]) =>
   projects.map(({ project }) => ({
      id: project.id,
      slug: project.slug,
      title: project.translations[0]?.title ?? project.slug,
   }));
