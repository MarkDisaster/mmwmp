/* eslint-disable */

import type { AuthorEntity } from './AuthorEntity';

export type TrashedItemEntity = {
   id: number;
   title: string;
   originalSlug: string | null;
   deletedAt: string;
   deletedBy: AuthorEntity | null;
   daysLeft: number;
};
