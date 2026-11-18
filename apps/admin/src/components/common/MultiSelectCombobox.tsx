import {
   type Announcements,
   closestCenter,
   DndContext,
   type DragEndEvent,
   type UniqueIdentifier,
} from '@dnd-kit/core';
import {
   arrayMove,
   horizontalListSortingStrategy,
   SortableContext,
   useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@mm/utils/cn';
import { CommandLoading, defaultFilter } from 'cmdk';
import { Check, ChevronsUpDown, GripVertical, X } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { GroupLabel } from '@/components/common/GroupLabel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSortableSensors } from '@/hooks/useSortableSensors';

export type ComboboxOption = { id: number; label: string };

export const COMBOBOX_OPTIONS_LIMIT = 100;

const filterByLabel = (_value: string, search: string, keywords: string[] = []) =>
   defaultFilter(keywords.join(' '), search);

type MultiSelectComboboxProps = {
   label: string;
   addLabel: string;
   searchPlaceholder: string;
   removeLabel: string;
   moveLabel?: string;
   selected: ComboboxOption[];
   onChange: (selected: ComboboxOption[]) => void;
   options: ComboboxOption[];
   loading?: boolean;
   error?: boolean;
   totalCount?: number;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   disabled?: boolean;
   keepEmptyBadgeRow?: boolean;
};

type SortableBadgeProps = {
   option: ComboboxOption;
   moveLabel: string;
   removeLabel: string;
   onRemove: (option: ComboboxOption) => void;
   disabled: boolean;
};

const REMOVE_BUTTON_CLASS =
   'hover:text-destructive ml-1 disabled:pointer-events-none disabled:opacity-50';

const SortableBadge = ({
   option,
   moveLabel,
   removeLabel,
   onRemove,
   disabled,
}: SortableBadgeProps) => {
   const {
      attributes,
      listeners,
      setNodeRef,
      setActivatorNodeRef,
      transform,
      transition,
      isDragging,
   } = useSortable({ id: option.id, disabled });

   return (
      <div
         ref={setNodeRef}
         style={{ transform: CSS.Transform.toString(transform), transition }}
         className={cn('flex items-center', isDragging && 'z-10 opacity-80')}
      >
         <Badge variant="secondary" className="gap-1 pr-1">
            <button
               ref={setActivatorNodeRef}
               type="button"
               {...attributes}
               {...listeners}
               role={undefined}
               aria-label={`${moveLabel} ${option.label}`}
               className="cursor-grab touch-none active:cursor-grabbing"
            >
               <GripVertical className="h-3 w-3 opacity-50" />
            </button>
            {option.label}
            <button
               type="button"
               onClick={() => onRemove(option)}
               disabled={disabled}
               aria-label={`${removeLabel} ${option.label}`}
               className={REMOVE_BUTTON_CLASS}
            >
               <X className="h-3 w-3" />
            </button>
         </Badge>
      </div>
   );
};

export const MultiSelectCombobox = ({
   label,
   addLabel,
   searchPlaceholder,
   removeLabel,
   moveLabel,
   selected,
   onChange,
   options,
   loading = false,
   error = false,
   totalCount,
   open,
   onOpenChange,
   disabled = false,
   keepEmptyBadgeRow = false,
}: MultiSelectComboboxProps) => {
   const { t } = useTranslation();
   const labelId = useId();
   const sensors = useSortableSensors();

   const isSelected = (option: ComboboxOption) => selected.some((item) => item.id === option.id);

   const toggle = (option: ComboboxOption) =>
      onChange(
         isSelected(option)
            ? selected.filter((item) => item.id !== option.id)
            : [...selected, option],
      );

   const describe = (id: UniqueIdentifier) => {
      const index = selected.findIndex((item) => item.id === id);
      return { name: selected[index]?.label, position: index + 1, total: selected.length };
   };

   const announcements: Announcements = {
      onDragStart: ({ active }) => t('common.sortableBadges.pickedUp', describe(active.id)),
      onDragOver: ({ active, over }) =>
         over
            ? t('common.sortableBadges.movedTo', {
                 ...describe(over.id),
                 name: describe(active.id).name,
              })
            : undefined,
      onDragEnd: ({ active, over }) =>
         over
            ? t('common.sortableBadges.dropped', {
                 ...describe(over.id),
                 name: describe(active.id).name,
              })
            : undefined,
      onDragCancel: () => t('common.sortableBadges.cancelled'),
   };

   const handleDragEnd = ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return;
      const from = selected.findIndex((item) => item.id === active.id);
      const to = selected.findIndex((item) => item.id === over.id);
      if (from < 0 || to < 0) return;
      onChange(arrayMove(selected, from, to));
   };

   const renderBadges = () => {
      if (!moveLabel) {
         return (
            <div className="flex flex-wrap gap-2">
               {selected.map((option) => (
                  <Badge key={option.id} variant="secondary" className="gap-1">
                     {option.label}
                     <button
                        type="button"
                        onClick={() => toggle(option)}
                        disabled={disabled}
                        aria-label={`${removeLabel} ${option.label}`}
                        className={REMOVE_BUTTON_CLASS}
                     >
                        <X className="h-3 w-3" />
                     </button>
                  </Badge>
               ))}
            </div>
         );
      }
      return (
         <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            accessibility={{
               announcements,
               screenReaderInstructions: { draggable: t('common.sortableBadges.instructions') },
            }}
         >
            <SortableContext
               items={selected.map((option) => option.id)}
               strategy={horizontalListSortingStrategy}
            >
               <div className="flex flex-wrap gap-2">
                  {selected.map((option) => (
                     <SortableBadge
                        key={option.id}
                        option={option}
                        moveLabel={moveLabel}
                        removeLabel={removeLabel}
                        onRemove={toggle}
                        disabled={disabled}
                     />
                  ))}
               </div>
            </SortableContext>
         </DndContext>
      );
   };

   return (
      <div role="group" aria-labelledby={labelId} className="space-y-2">
         <GroupLabel id={labelId}>{label}</GroupLabel>

         {(selected.length > 0 || keepEmptyBadgeRow) && renderBadges()}

         <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
               <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={disabled}
                  className="w-full justify-between"
               >
                  {addLabel}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
               </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
               <Command filter={filterByLabel}>
                  <CommandInput placeholder={searchPlaceholder} />
                  <CommandList>
                     {loading ? (
                        <CommandLoading
                           label={t('common.loading')}
                           className="py-6 text-center text-sm"
                        >
                           {t('common.loading')}
                        </CommandLoading>
                     ) : (
                        <CommandEmpty>
                           {error ? t('common.loadError') : t('common.noResults')}
                        </CommandEmpty>
                     )}
                     <CommandGroup>
                        {options.map((option) => (
                           <CommandItem
                              key={option.id}
                              value={`${option.id}-${option.label}`}
                              keywords={[option.label]}
                              disabled={disabled}
                              onSelect={() => toggle(option)}
                           >
                              <Check
                                 className={cn(
                                    'mr-2 h-4 w-4',
                                    isSelected(option) ? 'opacity-100' : 'opacity-0',
                                 )}
                              />
                              {option.label}
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  </CommandList>
                  {totalCount !== undefined && totalCount > options.length && (
                     <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                        {t('common.optionsTruncated', { shown: options.length, total: totalCount })}
                     </p>
                  )}
               </Command>
            </PopoverContent>
         </Popover>
      </div>
   );
};
