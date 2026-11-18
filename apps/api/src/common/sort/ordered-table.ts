import { BadRequestException, NotFoundException } from '@nestjs/common';

import { incrementVersion } from '@/common/concurrency/record-version';
import { assertEditAllowed } from '@/common/save/publication';
import { Prisma } from '@/generated/prisma/client';
import type { EntityStatus } from '@/generated/prisma/enums';
import { trashCondition } from '@/prisma/aggregate-lock.helper';
import type { PrismaService } from '@/prisma/prisma.service';
import { toBusyHttpError } from '@/prisma/save-error.helper';
import { INTERACTIVE_TRANSACTION_OPTIONS } from '@/prisma/transaction.helper';

import type { MovePosition } from './move-positions';

export type OrderedTable = 'services' | 'projects' | 'tags';

type OrderedRow = { id: number; sortOrder: number };

export const ORDER_LABELS = {
   services: 'Service',
   projects: 'Project',
   tags: 'Tag',
} as const satisfies Record<OrderedTable, string>;

export type OrderLabel = (typeof ORDER_LABELS)[OrderedTable];

const inOrderTransaction = <T>(
   prisma: PrismaService,
   write: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> =>
   prisma.$transaction(write, INTERACTIVE_TRANSACTION_OPTIONS).catch((error: unknown) => {
      throw toBusyHttpError(error);
   });

const SORT_ORDER_TABLES = {
   services: true,
   projects: true,
   tags: true,
   project_media: false,
} as const satisfies Record<OrderedTable | 'project_media', boolean>;

export const writeSortOrders = async (
   tx: Prisma.TransactionClient,
   table: keyof typeof SORT_ORDER_TABLES,
   rows: OrderedRow[],
) => {
   if (rows.length === 0) return;
   const values = Prisma.join(
      rows.map((row) => Prisma.sql`(${row.id}::int, ${row.sortOrder}::int)`),
   );
   const touch = SORT_ORDER_TABLES[table]
      ? Prisma.sql`, updated_at = NOW() AT TIME ZONE 'UTC'`
      : Prisma.empty;
   await tx.$executeRaw(Prisma.sql`
      UPDATE ${Prisma.raw(table)}
      SET sort_order = moved.sort_order${touch}
      FROM (VALUES ${values}) AS moved(id, sort_order)
      WHERE ${Prisma.raw(table)}.id = moved.id`);
};

export const lockOrder = async (tx: Prisma.TransactionClient, table: OrderedTable) => {
   await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`${table}.sort_order`}))`,
   );
};

export const nextSortOrder = async (tx: Prisma.TransactionClient, table: OrderedTable) => {
   const [{ next }] = await tx.$queryRaw<{ next: number }[]>(
      Prisma.sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM ${Prisma.raw(table)}`,
   );
   return next;
};

export const createAtEnd = <T>(
   prisma: PrismaService,
   table: OrderedTable,
   create: (tx: Prisma.TransactionClient, sortOrder: number) => Promise<T>,
) =>
   inOrderTransaction(prisma, async (tx) => {
      await lockOrder(tx, table);
      return create(tx, await nextSortOrder(tx, table));
   });

export const planMove = (
   rows: OrderedRow[],
   id: number,
   targetId: number,
   position: MovePosition,
   label: string,
): OrderedRow[] => {
   const ids = rows.map((row) => row.id);
   if (!ids.includes(id)) throw new NotFoundException(`${label} not found`);
   if (!ids.includes(targetId))
      throw new BadRequestException(`${label} ${targetId} does not exist`);

   const reordered = ids.filter((rowId) => rowId !== id);
   const targetIndex = reordered.indexOf(targetId);
   reordered.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, id);

   const currentOrder = new Map(rows.map((row) => [row.id, row.sortOrder]));
   return reordered.flatMap((rowId, sortOrder) =>
      currentOrder.get(rowId) === sortOrder ? [] : [{ id: rowId, sortOrder }],
   );
};

type MoveRequest = {
   id: number;
   targetId: number;
   position: MovePosition;
   expectedVersion?: number;
} & (
   | { table: 'tags' }
   | {
        table: Exclude<OrderedTable, 'tags'>;
        canPublish: boolean;
     }
);

export const moveInTable = async (prisma: PrismaService, request: MoveRequest) => {
   const { table, id, targetId, position } = request;
   const label = ORDER_LABELS[table];
   if (targetId === id) {
      throw new BadRequestException(`A ${label.toLowerCase()} cannot be placed next to itself`);
   }

   return inOrderTransaction(prisma, async (tx) => {
      await lockOrder(tx, table);
      if ('canPublish' in request && !request.canPublish) {
         const [moved] = await tx.$queryRaw<{ status: EntityStatus }[]>(
            Prisma.sql`SELECT status::text AS status FROM ${Prisma.raw(table)} WHERE id = ${id}${trashCondition(table, 'live')} FOR NO KEY UPDATE`,
         );
         if (moved) assertEditAllowed(moved.status, request.canPublish);
      }
      const rows = await tx.$queryRaw<OrderedRow[]>(
         Prisma.sql`SELECT id, sort_order AS "sortOrder" FROM ${Prisma.raw(table)} WHERE true${trashCondition(table, 'live')} ORDER BY sort_order, id`,
      );

      const changed = planMove(rows, id, targetId, position, label);
      const version = await incrementVersion(tx, {
         table,
         id,
         expectedVersion: request.expectedVersion,
         state: 'live',
      });
      await writeSortOrders(tx, table, changed);
      return { moved: changed.length, version };
   });
};
