import type { Query } from '@tanstack/react-query';

import type { MoveItemDto } from '@/api/generated';

export type ItemMove = MoveItemDto & { id: number };

export type RowMove = {
   id: string;
   targetId: string;
   position: MoveItemDto['position'];
};

export type DataTableReorder = {
   onReorder: (move: RowMove) => void;
   disabled?: boolean;
   isRowDisabled?: (rowId: string) => boolean;
};

export const isSavedOrderSort = (sortBy?: string, sortOrder?: string) =>
   !sortBy || (sortBy === 'sortOrder' && sortOrder !== 'desc');

export const moveRow = <T extends { id: number }>(
   rows: T[],
   { id, targetId, position }: ItemMove,
): T[] => {
   const moved = rows.find((row) => row.id === id);
   const others = rows.filter((row) => row.id !== id);
   const targetIndex = others.findIndex((row) => row.id === targetId);
   if (!moved || targetIndex < 0) return rows;

   const at = position === 'before' ? targetIndex : targetIndex + 1;
   return [...others.slice(0, at), moved, ...others.slice(at)];
};

export const getDropMove = (
   ids: readonly string[],
   activeId: string,
   overId: string,
): RowMove | null => {
   if (activeId === overId) return null;
   const oldIndex = ids.indexOf(activeId);
   const newIndex = ids.indexOf(overId);
   if (oldIndex < 0 || newIndex < 0) return null;
   return { id: activeId, targetId: overId, position: oldIndex < newIndex ? 'after' : 'before' };
};

export const isSavedOrderList = (query: Query) => {
   const params = query.queryKey[2] as { sortBy?: string; sortOrder?: string } | undefined;
   return isSavedOrderSort(params?.sortBy, params?.sortOrder);
};

export const getPublishedRowLock = (
   rows: readonly { id: number; status: string }[],
   canPublish: boolean,
): ((rowId: string) => boolean) | undefined => {
   if (canPublish) return undefined;
   const published = new Set(
      rows.filter((row) => row.status === 'published').map((row) => String(row.id)),
   );
   return (rowId) => published.has(rowId);
};
