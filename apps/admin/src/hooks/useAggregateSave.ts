import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type {
   FieldValues,
   UseFormReset,
   UseFormSetError,
   UseFormStateReturn,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useRecordVersion } from '@/hooks/useRecordVersion';
import { useVersionConflictDialog } from '@/hooks/useVersionConflictDialog';
import { getHttpErrorMessageKey } from '@/utils/httpError';
import { getSaveFailure, type SaveFailure } from '@/utils/saveFailure';

type AggregateSaveConfig<TEntity, TValues, TDto extends { version?: number }> = {
   saveNew: UseMutationOptions<TEntity, Error, { data: TDto }>;
   saveExisting: UseMutationOptions<TEntity, Error, { id: number; data: TDto }>;
   toDto: (values: TValues, options: { status?: 'published' }) => TDto;
   toValues: (saved: TEntity) => TValues;
   openCreated: (saved: TEntity) => Promise<void>;
   fetchCurrent: (id: number) => Promise<TEntity>;
   messages: {
      failure: Record<Exclude<SaveFailure, 'versionConflict'>, string>;
      created: string;
      saved: string;
      published: string;
   };
};

export const useAggregateSave = <
   TEntity extends { id: number; version: number },
   TValues extends FieldValues,
   TDto extends { version?: number },
>(
   entity: TEntity | undefined,
   form: {
      reset: UseFormReset<TValues>;
      setError: UseFormSetError<{ slug: string }>;
      formState: UseFormStateReturn<TValues>;
   },
   {
      saveNew,
      saveExisting,
      toDto,
      toValues,
      openCreated,
      fetchCurrent,
      messages,
   }: AggregateSaveConfig<TEntity, TValues, TDto>,
) => {
   const { t } = useTranslation();
   const saveNewMutation = useMutation(saveNew);
   const saveExistingMutation = useMutation(saveExisting);
   const recordVersion = useRecordVersion(entity, form.formState.isDirty);

   const loadCurrent = async () => {
      if (!entity) return;
      const current = await fetchCurrent(entity.id);
      form.reset(toValues(current));
      recordVersion.adopt(current);
   };
   const conflict = useVersionConflictDialog(loadCurrent);

   const save = async (values: TValues, { publish = false }: { publish?: boolean } = {}) => {
      const data = toDto(values, { status: publish ? 'published' : undefined });
      let saved: TEntity;
      try {
         saved = entity
            ? await saveExistingMutation.mutateAsync({
                 id: entity.id,
                 data: { ...data, version: recordVersion.version },
              })
            : await saveNewMutation.mutateAsync({ data });
      } catch (error) {
         const failure = getSaveFailure(error);
         if (failure === 'versionConflict') {
            conflict.show();
            return;
         }
         const message = t(getHttpErrorMessageKey(error) ?? messages.failure[failure]);
         if (failure === 'slugTaken') form.setError('slug', { type: 'server', message });
         toast.error(message);
         return;
      }

      if (publish) toast.success(t(messages.published));
      else toast.success(t(entity ? messages.saved : messages.created));
      if (entity) {
         form.reset(toValues(saved));
         recordVersion.adopt(saved);
         return;
      }
      await openCreated(saved);
   };

   return {
      save,
      conflictDialogProps: conflict.dialogProps,
      hasNewerVersion: recordVersion.hasNewer,
      reload: conflict.reload,
      isReloading: conflict.dialogProps.isReloading,
   };
};
