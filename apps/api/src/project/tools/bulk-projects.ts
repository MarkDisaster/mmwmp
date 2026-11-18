import { HttpException, Logger } from '@nestjs/common';
import { z } from 'zod';

import type { ProjectService } from '../project.service';

export const BULK_PROJECTS_MAX = 50;

const bulkProjectSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the project.'),
   title: z.string().describe('Its title as `listProjects` / `findProjects` returned it.'),
});

export const bulkProjectsSchema = z
   .array(bulkProjectSchema)
   .min(1)
   .max(BULK_PROJECTS_MAX)
   .refine((projects) => new Set(projects.map(({ id }) => id)).size === projects.length, {
      message: 'Each project may appear only once.',
   })
   .describe(`1 to ${BULK_PROJECTS_MAX} projects.`);

type BulkProject = z.infer<typeof bulkProjectSchema>;

const logger = new Logger('BulkProjects');

export const verifyBulkInput = async (
   service: Pick<ProjectService, 'findBulkNames'>,
   projects: BulkProject[],
   tag?: { tagId: number; tagName: string },
) => {
   const { titles, tagName } = await service.findBulkNames(
      projects.map(({ id }) => id),
      tag?.tagId,
   );
   const problems: { id: number; title: string; reason: string }[] = [];
   for (const project of projects) {
      const actual = titles.get(project.id);
      if (actual === undefined) {
         problems.push({ ...project, reason: 'Project not found' });
      } else if (actual !== project.title) {
         problems.push({
            ...project,
            reason: `The project is titled "${actual}", not "${project.title}"`,
         });
      }
   }
   if (tag && tagName !== tag.tagName) {
      problems.push({
         id: 0,
         title: tag.tagName,
         reason:
            tagName === null
               ? 'Tag not found'
               : `The tag is named "${tagName}", not "${tag.tagName}"`,
      });
   }
   return problems;
};

export const refused = (problems: { id: number; title: string; reason: string }[]) => ({
   applied: false,
   doneCount: 0,
   failedCount: problems.length,
   done: [],
   failed: problems,
});

export const runPerProject = async (
   projects: BulkProject[],
   change: (project: BulkProject) => Promise<void>,
) => {
   const done: { id: number; title: string }[] = [];
   const failed: { id: number; title: string; reason: string }[] = [];
   for (const project of projects) {
      try {
         await change(project);
         done.push({ id: project.id, title: project.title });
      } catch (error) {
         if (error instanceof HttpException) {
            failed.push({ id: project.id, title: project.title, reason: error.message });
         } else {
            logger.error(`Bulk change of project ${project.id} failed`, error);
            failed.push({ id: project.id, title: project.title, reason: 'Unexpected error' });
         }
      }
   }
   return {
      applied: failed.length === 0,
      doneCount: done.length,
      failedCount: failed.length,
      done,
      failed,
   };
};

export const doneIds = (output: unknown): string | null => {
   const done = (output as { done?: { id: number }[] } | null)?.done;
   return done?.length ? done.map(({ id }) => id).join(',') : null;
};
