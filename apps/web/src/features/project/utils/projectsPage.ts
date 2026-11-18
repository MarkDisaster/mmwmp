import { z } from 'zod';

import { PROJECTS_MAX_PAGE } from '@/features/project/constants';
import { routing } from '@/i18n/routing';

const projectsPageSchema = z
   .string()
   .regex(/^[1-9]\d*$/)
   .transform(Number)
   .pipe(z.number().min(2).max(PROJECTS_MAX_PAGE));

export const parsePage = (value: string): number | null => {
   const result = projectsPageSchema.safeParse(value);
   return result.success ? result.data : null;
};

export type ProjectsPageRange = { first: number; last: number };

const RANGE_SEGMENT = /^([1-9]\d*)-([1-9]\d*)$/;

export const parseProjectsPageRange = (value: string): ProjectsPageRange | null => {
   const single = parsePage(value);
   if (single) return { first: single, last: single };

   const match = RANGE_SEGMENT.exec(value);
   if (!match) return null;

   const first = Number(match[1]);
   const last = Number(match[2]);
   return first < last && last <= PROJECTS_MAX_PAGE ? { first, last } : null;
};

export const projectsPageQuerySchema = z.object({
   locale: z.enum(routing.locales),
   page: projectsPageSchema,
});
