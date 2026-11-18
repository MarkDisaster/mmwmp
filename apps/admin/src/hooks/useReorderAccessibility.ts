import type { Announcements, DndContextProps } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';

export const useReorderAccessibility = (
   ids: readonly string[],
   kind: 'row' | 'card',
): NonNullable<DndContextProps['accessibility']> => {
   const { t } = useTranslation();
   const prefix = kind === 'row' ? 'common.reorder' : 'common.reorder.card';

   const position = (id: string | number) => ({
      position: ids.indexOf(String(id)) + 1,
      total: ids.length,
   });
   const announcements: Announcements = {
      onDragStart: ({ active }) => t(`${prefix}.pickedUp`, position(active.id)),
      onDragOver: ({ over }) => (over ? t(`${prefix}.movedTo`, position(over.id)) : undefined),
      onDragEnd: ({ over }) => (over ? t(`${prefix}.dropped`, position(over.id)) : undefined),
      onDragCancel: () => t('common.reorder.cancelled'),
   };

   return { screenReaderInstructions: { draggable: t(`${prefix}.instructions`) }, announcements };
};
