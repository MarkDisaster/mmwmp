import type { Prisma } from '@/generated/prisma/client';

export const NOT_TRASHED = { deletedAt: null } as const satisfies Prisma.ProjectWhereInput &
   Prisma.ServiceWhereInput &
   Prisma.TagWhereInput &
   Prisma.FileWhereInput;

export const IN_TRASH = { deletedAt: { not: null } } as const satisfies Prisma.ProjectWhereInput &
   Prisma.ServiceWhereInput &
   Prisma.TagWhereInput &
   Prisma.FileWhereInput;

export type TrashedRow = {
   id: number;
   title: string;
   originalSlug?: string | null;
   deletedAt: Date | null;
   deletedBy: { id: number; firstName: string; lastName: string; email?: string } | null;
};

export const toTrashedItem = (row: TrashedRow, retentionDays: number, now = new Date()) => {
   const deletedAt = row.deletedAt ?? now;
   return {
      id: row.id,
      title: row.title,
      originalSlug: row.originalSlug ?? null,
      deletedAt,
      deletedBy: row.deletedBy,
      daysLeft: daysLeftInTrash(deletedAt, retentionDays, now),
   };
};

export const trashedSlug = (slug: string, id: number) => `${slug}--trashed-${id}`;

export const DEFAULT_TRASH_RETENTION_DAYS = 30;

export const daysLeftInTrash = (deletedAt: Date, retentionDays: number, now = new Date()) => {
   const left = retentionDays - (now.getTime() - deletedAt.getTime()) / 86_400_000;
   return Math.max(0, Math.ceil(left));
};
