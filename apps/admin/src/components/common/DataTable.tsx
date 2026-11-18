import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@mm/utils/cn';
import {
   flexRender,
   type Row,
   type RowData,
   type SortDirection,
   type Table as TanstackTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from 'lucide-react';
import type { AriaAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { DataTablePagination } from '@/components/common/DataTablePagination';
import { NoRecords } from '@/components/common/NoRecords';
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table';
import { useReorderAccessibility } from '@/hooks/useReorderAccessibility';
import { useSortableSensors } from '@/hooks/useSortableSensors';
import { onActivateKey } from '@/utils/a11y';
import { type DataTableReorder, getDropMove } from '@/utils/reorder';

type DataTableProps<TData extends RowData> = {
   table: TanstackTable<TData>;
   onRowClick?: (row: TData) => void;
   rowsHaveLink?: boolean;
   isFetching?: boolean;
   reorder?: DataTableReorder;
   emptyState?: ReactNode;
};

const isIgnoredRowClick = (target: EventTarget) =>
   !!(target as HTMLElement).closest('[data-row-click="ignore"], a');

const CLICKABLE_ROW_CLASS =
   'cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring';

const getRowActivationProps = <TData extends RowData>(
   row: Row<TData>,
   onRowClick?: (row: TData) => void,
   rowsHaveLink?: boolean,
) => {
   if (!onRowClick) return {};
   const open = () => onRowClick(row.original);
   const onClick = (e: MouseEvent<HTMLElement>) => {
      if (!isIgnoredRowClick(e.target)) open();
   };
   if (rowsHaveLink) return { onClick };
   const activateByKey = onActivateKey(open);
   return {
      tabIndex: 0,
      onClick,
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
         if (e.target === e.currentTarget) activateByKey(e);
      },
   };
};

const ARIA_SORT: Record<SortDirection, AriaAttributes['aria-sort']> = {
   asc: 'ascending',
   desc: 'descending',
};

const SortIcon = ({ sorted }: { sorted: SortDirection | false }) => {
   if (sorted === 'asc') return <ArrowUp className="h-3.5 w-3.5" />;
   if (sorted === 'desc') return <ArrowDown className="h-3.5 w-3.5" />;
   return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
};

const RowCells = <TData extends RowData>({ row }: { row: Row<TData> }) => {
   return row
      .getVisibleCells()
      .map((cell) => (
         <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
         </TableCell>
      ));
};

type SortableDataRowProps<TData extends RowData> = {
   row: Row<TData>;
   disabled?: boolean;
   onRowClick?: (row: TData) => void;
   rowsHaveLink?: boolean;
};

const SortableDataRow = <TData extends RowData>({
   row,
   disabled,
   onRowClick,
   rowsHaveLink,
}: SortableDataRowProps<TData>) => {
   const { t } = useTranslation();
   const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: row.id,
      disabled,
      attributes: { roleDescription: t('common.reorder.roleDescription') },
   });

   return (
      <TableRow
         ref={setNodeRef}
         style={{
            transform: CSS.Translate.toString(transform && { ...transform, x: 0 }),
            transition,
         }}
         className={cn(
            onRowClick && CLICKABLE_ROW_CLASS,
            isDragging && 'relative z-10 bg-background opacity-80 shadow-md',
         )}
         {...getRowActivationProps(row, onRowClick, rowsHaveLink)}
      >
         <TableCell className="w-10" data-row-click="ignore">
            <button
               type="button"
               aria-label={t('common.reorder.dragHandle')}
               {...attributes}
               {...listeners}
               className={cn(
                  'touch-none text-muted-foreground',
                  disabled ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing',
               )}
            >
               <GripVertical className="h-4 w-4" />
            </button>
         </TableCell>
         <RowCells row={row} />
      </TableRow>
   );
};

const DataTable = <TData extends RowData>({
   table,
   onRowClick,
   rowsHaveLink,
   isFetching,
   reorder,
   emptyState = <NoRecords />,
}: DataTableProps<TData>) => {
   const { t } = useTranslation();
   const rows = table.getRowModel().rows;
   const sensors = useSortableSensors();

   const rowIds = rows.map((row) => row.id);

   const handleDragEnd = ({ active, over }: DragEndEvent) => {
      if (!reorder || !over) return;
      const move = getDropMove(rowIds, String(active.id), String(over.id));
      if (move) reorder.onReorder(move);
   };

   const accessibility = useReorderAccessibility(rowIds, 'row');

   const body = rows.length ? (
      rows.map((row) =>
         reorder ? (
            <SortableDataRow
               key={row.id}
               row={row}
               disabled={reorder.disabled || reorder.isRowDisabled?.(row.id)}
               onRowClick={onRowClick}
               rowsHaveLink={rowsHaveLink}
            />
         ) : (
            <TableRow
               key={row.id}
               className={cn(onRowClick && CLICKABLE_ROW_CLASS)}
               {...getRowActivationProps(row, onRowClick, rowsHaveLink)}
            >
               <RowCells row={row} />
            </TableRow>
         ),
      )
   ) : (
      <TableRow>
         <TableCell
            colSpan={table.getAllColumns().length + (reorder ? 1 : 0)}
            className="h-24 text-center"
         >
            {emptyState}
         </TableCell>
      </TableRow>
   );

   const tableElement = (
      <Table>
         <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
               <TableRow key={headerGroup.id}>
                  {reorder && (
                     <TableHead className="w-10">
                        <span className="sr-only">{t('common.reorder.dragHandle')}</span>
                     </TableHead>
                  )}
                  {headerGroup.headers.map((header) => {
                     if (header.isPlaceholder) return <TableHead key={header.id} />;

                     const content = flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                     );
                     if (!header.column.getCanSort()) {
                        return (
                           <TableHead key={header.id}>
                              <div className="flex items-center gap-1">{content}</div>
                           </TableHead>
                        );
                     }

                     const sorted = header.column.getIsSorted();
                     return (
                        <TableHead key={header.id} aria-sort={sorted ? ARIA_SORT[sorted] : 'none'}>
                           <button
                              type="button"
                              className="flex w-full cursor-pointer items-center gap-1 rounded-sm outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                              onClick={header.column.getToggleSortingHandler()}
                           >
                              {content}
                              <SortIcon sorted={sorted} />
                           </button>
                        </TableHead>
                     );
                  })}
               </TableRow>
            ))}
         </TableHeader>
         {reorder ? (
            <SortableContext
               items={rowIds}
               strategy={verticalListSortingStrategy}
               disabled={reorder.disabled}
            >
               <TableBody>{body}</TableBody>
            </SortableContext>
         ) : (
            <TableBody>{body}</TableBody>
         )}
      </Table>
   );

   return (
      <div className={cn('transition-opacity', isFetching && 'pointer-events-none opacity-50')}>
         {reorder ? (
            <DndContext
               sensors={sensors}
               collisionDetection={closestCenter}
               accessibility={accessibility}
               onDragEnd={handleDragEnd}
            >
               {tableElement}
            </DndContext>
         ) : (
            tableElement
         )}
         <DataTablePagination table={table} />
      </div>
   );
};

export { DataTable };
