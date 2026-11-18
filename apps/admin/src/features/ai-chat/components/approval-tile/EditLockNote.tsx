import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import {
   getEditLockTargets,
   MAX_EDIT_LOCK_LOOKUPS,
} from '@/features/ai-chat/utils/editLockTargets';
import { useAuth } from '@/hooks/useAuth';

export const EditLockNote = ({ toolName, input }: { toolName: string; input: unknown }) => {
   const { t } = useTranslation();
   const { user } = useAuth();
   const targets = getEditLockTargets(toolName, input).slice(0, MAX_EDIT_LOCK_LOOKUPS);
   const locks = useQueries({
      queries: targets.map(({ entity, id }) => api.editLocks.queries.detail(entity, id)),
   });
   const editedBy = locks
      .map(({ data }) => data?.heldBy)
      .find((holder) => holder && holder.userId !== user?.id);

   return editedBy ? <p>{t('chat.approval.editedBy', { name: editedBy.name })}</p> : null;
};
