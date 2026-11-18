import { ConflictException, HttpStatus, NotFoundException } from '@nestjs/common';

import { ApiErrorCode } from '@/common/enum/api-error-code.enum';
import { Prisma } from '@/generated/prisma/client';
import type { TrashState } from '@/prisma/aggregate-lock.helper';

const VERSIONED_TABLES = {
   projects: { label: 'Project', trash: true },
   services: { label: 'Service', trash: true },
   tags: { label: 'Tag', trash: true },
   files: { label: 'File', trash: true },
   contacts: { label: 'Contact', trash: false },
} as const;

export type VersionedTable = keyof typeof VERSIONED_TABLES;

const TRASH_CONDITIONS = {
   live: Prisma.sql` AND deleted_at IS NULL`,
   trashed: Prisma.sql` AND deleted_at IS NOT NULL`,
} as const satisfies Record<TrashState, Prisma.Sql>;

const VERSION_CONFLICT_MESSAGE =
   'Someone else changed the record since it was loaded. Reload it and try again';

const versionConflict = (currentVersion: number) =>
   new ConflictException({
      statusCode: HttpStatus.CONFLICT,
      message: VERSION_CONFLICT_MESSAGE,
      error: 'Conflict',
      code: ApiErrorCode.VERSION_CONFLICT,
      currentVersion,
   });

export type VersionedRecord = {
   id: number;
   expectedVersion?: number;
};

type IncrementVersion = VersionedRecord & {
   table: VersionedTable;
   state?: TrashState;
};

export const incrementVersion = async (
   tx: Prisma.TransactionClient,
   { table, id, expectedVersion, state }: IncrementVersion,
) => {
   const { label, trash } = VERSIONED_TABLES[table];
   const inState = !trash || !state ? Prisma.empty : TRASH_CONDITIONS[state];
   const [row] = await tx.$queryRaw<{ version: number }[]>(
      Prisma.sql`UPDATE ${Prisma.raw(table)} SET version = version + 1 WHERE id = ${id}${inState} RETURNING version`,
   );
   if (!row) throw new NotFoundException(`${label} not found`);
   const storedVersion = row.version - 1;
   if (expectedVersion !== undefined && expectedVersion !== storedVersion) {
      throw versionConflict(storedVersion);
   }
   return row.version;
};
