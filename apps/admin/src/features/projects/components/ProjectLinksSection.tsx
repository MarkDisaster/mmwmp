import {
   type Announcements,
   closestCenter,
   DndContext,
   type DragEndEvent,
   type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@mm/utils/cn';
import { GripVertical, Plus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { GroupLabel } from '@/components/common/GroupLabel';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/features/form/components/FormInput';
import {
   EMPTY_LINK,
   focusIndexAfterRemove,
   hasFilledLink,
} from '@/features/projects/utils/projectLinks';
import {
   MAX_PROJECT_LINKS,
   type ProjectFormValues,
} from '@/features/projects/validation/projectSchema';
import { useSortableSensors } from '@/hooks/useSortableSensors';

type SortableLinkRowProps = {
   id: string;
   index: number;
   onRemove: (index: number) => void;
};

const SortableLinkRow = ({ id, index, onRemove }: SortableLinkRowProps) => {
   const { t } = useTranslation();
   const {
      attributes,
      listeners,
      setNodeRef,
      setActivatorNodeRef,
      transform,
      transition,
      isDragging,
   } = useSortable({ id });

   return (
      <div
         ref={setNodeRef}
         style={{ transform: CSS.Translate.toString(transform), transition }}
         className={cn('flex items-start gap-2', isDragging && 'relative z-10 opacity-80')}
      >
         <Button
            ref={setActivatorNodeRef}
            type="button"
            variant="ghost"
            size="icon"
            className="cursor-grab touch-none active:cursor-grabbing"
            {...attributes}
            {...listeners}
            role={undefined}
            aria-label={`${t('projects.form.moveLink')} ${index + 1}`}
         >
            <GripVertical className="opacity-50" />
         </Button>
         <div className="min-w-0 flex-1">
            <FormInput
               name={`links.${index}.url`}
               placeholder="https://"
               aria-label={`${t('projects.form.linkUrl')} ${index + 1}`}
            />
         </div>
         <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${t('projects.form.removeLink')} ${index + 1}`}
            onClick={() => onRemove(index)}
         >
            <X />
         </Button>
      </div>
   );
};

export const ProjectLinksSection = () => {
   const { t } = useTranslation();
   const labelId = useId();
   const limitId = useId();
   const {
      control,
      setFocus,
      formState: { errors },
   } = useFormContext<ProjectFormValues>();
   const { fields, append, remove, replace, move } = useFieldArray({ control, name: 'links' });
   const sensors = useSortableSensors();
   const pendingFocus = useRef<number | undefined>(undefined);
   const [removal, setRemoval] = useState<{ key: number; text: string } | null>(null);

   useEffect(() => {
      const target = pendingFocus.current;
      if (target === undefined) return;
      pendingFocus.current = undefined;
      setFocus(`links.${target}.url`);
   }, [fields, setFocus]);

   const links = useWatch({ control, name: 'links' });
   const showAddButton = hasFilledLink(links);
   const isFull = fields.length >= MAX_PROJECT_LINKS;
   const listError = errors.links?.root?.message ?? errors.links?.message;

   const positionOf = (id: UniqueIdentifier) => fields.findIndex((field) => field.id === id) + 1;

   const announcements: Announcements = {
      onDragStart: ({ active }) =>
         t('projects.form.linkPickedUp', { position: positionOf(active.id) }),
      onDragOver: ({ over }) =>
         over
            ? t('projects.form.linkMovedOver', {
                 position: positionOf(over.id),
                 total: fields.length,
              })
            : undefined,
      onDragEnd: ({ over }) =>
         over ? t('projects.form.linkDropped', { position: positionOf(over.id) }) : undefined,
      onDragCancel: () => t('projects.form.linkDragCancelled'),
   };

   const handleDragEnd = ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return;
      const from = fields.findIndex((field) => field.id === active.id);
      const to = fields.findIndex((field) => field.id === over.id);
      if (from < 0 || to < 0) return;
      move(from, to);
   };

   const handleRemove = (index: number) => {
      const remaining = fields.length - 1;
      pendingFocus.current = focusIndexAfterRemove(index, remaining);
      if (remaining === 0) replace([{ ...EMPTY_LINK }]);
      else remove(index);
      setRemoval((previous) => ({
         key: (previous?.key ?? 0) + 1,
         text: t('projects.form.linkRemoved', { position: index + 1, count: remaining }),
      }));
   };

   return (
      <div role="group" aria-labelledby={labelId} className="space-y-2">
         <GroupLabel id={labelId}>{t('projects.form.links')}</GroupLabel>

         <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            accessibility={{
               announcements,
               screenReaderInstructions: { draggable: t('projects.form.moveLinkInstructions') },
            }}
         >
            <SortableContext
               items={fields.map((field) => field.id)}
               strategy={verticalListSortingStrategy}
            >
               {fields.map((field, index) => (
                  <SortableLinkRow
                     key={field.id}
                     id={field.id}
                     index={index}
                     onRemove={handleRemove}
                  />
               ))}
            </SortableContext>
         </DndContext>

         {listError && <p className="text-sm text-destructive">{listError}</p>}

         <div className="flex items-center gap-3">
            {showAddButton && (
               <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isFull}
                  aria-describedby={isFull ? limitId : undefined}
                  onClick={() => append({ ...EMPTY_LINK }, { shouldFocus: true })}
               >
                  <Plus />
                  {t('projects.form.addLink')}
               </Button>
            )}
            <p id={limitId} role="status" className="text-sm text-muted-foreground">
               {isFull && t('projects.form.linksLimitReached', { max: MAX_PROJECT_LINKS })}
            </p>
         </div>

         <div className="sr-only" aria-live="polite">
            {removal && <span key={removal.key}>{removal.text}</span>}
         </div>
      </div>
   );
};
