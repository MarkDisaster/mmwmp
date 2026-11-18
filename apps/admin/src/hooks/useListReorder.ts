import type { MoveItemDto } from '@/api/generated';
import { type DataTableReorder, isSavedOrderSort, type RowMove } from '@/utils/reorder';

type ListReorderOptions = {
   itemCount: number;
   sorting: { id: string; desc: boolean } | undefined;
   isPlaceholderData: boolean;
   move: {
      mutate: (variables: { id: number; data: MoveItemDto }) => void;
      isPending: boolean;
   };
   canMove?: boolean;
   isRowLocked?: (rowId: string) => boolean;
};

export const useListReorder = ({
   itemCount,
   sorting,
   isPlaceholderData,
   move,
   canMove = true,
   isRowLocked,
}: ListReorderOptions) => {
   const canReorder =
      itemCount > 1 && isSavedOrderSort(sorting?.id, sorting?.desc ? 'desc' : 'asc');

   const onReorder = ({ id, targetId, position }: RowMove) => {
      move.mutate({ id: Number(id), data: { targetId: Number(targetId), position } });
   };

   const reorder: DataTableReorder = {
      onReorder,
      disabled: !canReorder || isPlaceholderData || move.isPending,
      isRowDisabled: isRowLocked,
   };

   return { canReorder, reorder: canMove ? reorder : undefined };
};
