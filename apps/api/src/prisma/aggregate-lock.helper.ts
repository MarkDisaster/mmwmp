import { NotFoundException } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';
import type { EntityStatus } from '@/generated/prisma/enums';

import { setLockTimeout } from './transaction.helper';

type AggregateTable = 'projects' | 'services' | 'tags';

const NOT_FOUND_MESSAGES = {
   projects: 'Project not found',
   services: 'Service not found',
   tags: 'Tag not found',
} as const satisfies Record<AggregateTable, string>;

export type TrashState = 'live' | 'trashed';

export const trashCondition = (table: AggregateTable, state: TrashState) =>
   state === 'live' ? Prisma.sql` AND deleted_at IS NULL` : Prisma.sql` AND deleted_at IS NOT NULL`;

const lockAggregate = async <Row>(
   tx: Prisma.TransactionClient,
   table: AggregateTable,
   columns: Prisma.Sql,
   id: number,
   state: TrashState = 'live',
) => {
   await setLockTimeout(tx);
   const [row] = await tx.$queryRaw<Row[]>(
      Prisma.sql`SELECT ${columns} FROM ${Prisma.raw(table)} WHERE id = ${id}${trashCondition(table, state)} FOR NO KEY UPDATE`,
   );
   if (!row) throw new NotFoundException(NOT_FOUND_MESSAGES[table]);
   return row;
};

type LockedRow = { status: EntityStatus; slug: string };
const STATUS_AND_SLUG = Prisma.sql`status::text AS status, slug`;

export const lockProject = (tx: Prisma.TransactionClient, id: number, state?: TrashState) =>
   lockAggregate<LockedRow>(tx, 'projects', STATUS_AND_SLUG, id, state);

export const lockService = (tx: Prisma.TransactionClient, id: number, state?: TrashState) =>
   lockAggregate<LockedRow>(tx, 'services', STATUS_AND_SLUG, id, state);

export const lockTag = (tx: Prisma.TransactionClient, id: number, state?: TrashState) =>
   lockAggregate<{ slug: string }>(tx, 'tags', Prisma.sql`slug`, id, state);

export const lockRole = async (tx: Prisma.TransactionClient, id: number) => {
   await setLockTimeout(tx);
   const [row] = await tx.$queryRaw<{ isAdmin: boolean }[]>(
      Prisma.sql`SELECT is_admin AS "isAdmin" FROM roles WHERE id = ${id} FOR NO KEY UPDATE`,
   );
   if (!row) throw new NotFoundException('Role not found');
   return row;
};

export const lockRoleForAssignment = async (tx: Prisma.TransactionClient, id: number) => {
   await setLockTimeout(tx);
   const [row] = await tx.$queryRaw<{ isAdmin: boolean }[]>(
      Prisma.sql`SELECT is_admin AS "isAdmin" FROM roles WHERE id = ${id} FOR SHARE`,
   );
   return row ?? null;
};
