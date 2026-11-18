import type { QueryKey, UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { UpdateStatusDto } from '@/api/generated';
import { queryClient } from '@/utils/query-client';

type EntityEditorActionsConfig<TStatusResult, TStatusContext, TRemoveResult> = {
   updateStatus: UseMutationOptions<
      TStatusResult,
      Error,
      { id: number; data: UpdateStatusDto },
      TStatusContext
   >;
   remove: UseMutationOptions<TRemoveResult, Error, { id: number }>;
   onDeleted: () => unknown;
   detailKey: (id: number) => QueryKey;
   messages: { unpublished: string; statusFailed: string; deleted: string; deleteFailed: string };
};

export const useEntityEditorActions = <TStatusResult, TStatusContext, TRemoveResult>(
   entity: { id: number } | undefined,
   {
      updateStatus,
      remove,
      onDeleted,
      detailKey,
      messages,
   }: EntityEditorActionsConfig<TStatusResult, TStatusContext, TRemoveResult>,
) => {
   const { t } = useTranslation();
   const updateStatusMutation = useMutation({
      ...updateStatus,
      meta: { errorMessage: messages.statusFailed },
   });
   const removeMutation = useMutation({ ...remove, meta: { errorMessage: messages.deleteFailed } });

   const unpublish = () => {
      if (!entity) return;
      updateStatusMutation.mutate(
         { id: entity.id, data: { status: 'draft' } },
         { onSuccess: () => toast.success(t(messages.unpublished)) },
      );
   };

   const deleteEntity = () => {
      if (!entity) return;
      removeMutation.mutate(
         { id: entity.id },
         {
            onSuccess: async () => {
               toast.success(t(messages.deleted));
               try {
                  await onDeleted();
               } catch {
                  return;
               }
               queryClient.removeQueries({ queryKey: detailKey(entity.id), exact: true });
            },
         },
      );
   };

   return {
      unpublish,
      isUnpublishing: updateStatusMutation.isPending,
      delete: deleteEntity,
      isDeleting: removeMutation.isPending,
   };
};
