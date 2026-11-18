import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@mm/utils/cn';
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { CardGrid } from '@/features/layout/components/CardGrid';
import { useReorderAccessibility } from '@/hooks/useReorderAccessibility';
import { useSortableSensors } from '@/hooks/useSortableSensors';
import { type DataTableReorder, getDropMove } from '@/utils/reorder';

type SortableCardGridProps = {
   ids: string[];
   reorder: DataTableReorder;
   children: ReactNode;
};

export const SortableCardGrid = ({ ids, reorder, children }: SortableCardGridProps) => {
   const sensors = useSortableSensors();
   const accessibility = useReorderAccessibility(ids, 'card');

   const handleDragEnd = ({ active, over }: DragEndEvent) => {
      if (!over) return;
      const move = getDropMove(ids, String(active.id), String(over.id));
      if (move) reorder.onReorder(move);
   };

   return (
      <DndContext
         sensors={sensors}
         collisionDetection={closestCenter}
         accessibility={accessibility}
         onDragEnd={handleDragEnd}
      >
         <SortableContext items={ids} strategy={rectSortingStrategy} disabled={reorder.disabled}>
            <CardGrid>{children}</CardGrid>
         </SortableContext>
      </DndContext>
   );
};

type SortableCardProps = {
   id: string;
   disabled?: boolean;
   children: ReactNode;
};

export const SortableCard = ({ id, disabled, children }: SortableCardProps) => {
   const { t } = useTranslation();
   const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id,
      disabled,
      attributes: { roleDescription: t('common.reorder.card.roleDescription') },
   });

   return (
      <div
         ref={setNodeRef}
         style={{ transform: CSS.Translate.toString(transform), transition }}
         className={cn('relative', isDragging && 'z-10 opacity-80')}
      >
         {children}
         <button
            type="button"
            aria-label={t('common.reorder.dragHandle')}
            {...attributes}
            {...listeners}
            className={cn(
               'absolute top-2 right-2 touch-none rounded-md bg-background/80 p-1 text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
               disabled ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing',
            )}
         >
            <GripVertical className="h-4 w-4" />
         </button>
      </div>
   );
};
