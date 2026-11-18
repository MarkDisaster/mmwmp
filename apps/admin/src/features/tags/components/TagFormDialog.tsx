import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { TagEntity } from '@/api/generated';
import { EditLockBanner } from '@/components/common/EditLockBanner';
import { FormDialog } from '@/components/common/FormDialog';
import { LanguageSelector } from '@/components/common/LanguageSelector';
import { NewerVersionNotice } from '@/components/common/NewerVersionNotice';
import { ReadOnlyNotice } from '@/components/common/ReadOnlyNotice';
import { VersionConflictDialog } from '@/components/common/VersionConflictDialog';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { FormColorInput } from '@/features/form/components/FormColorInput';
import { FormInput } from '@/features/form/components/FormInput';
import { FormLockableInput } from '@/features/form/components/FormLockableInput';
import {
   buildDefaultValues,
   createEmptyTranslation,
   toSaveTagDto,
} from '@/features/tags/utils/tagFormValues';
import type { TagFormValues } from '@/features/tags/validation/tagSchema';
import { tagSchema } from '@/features/tags/validation/tagSchema';
import { useEntityFormSync } from '@/hooks/useEntityFormSync';
import { usePermission } from '@/hooks/usePermission';
import { useRecordVersion } from '@/hooks/useRecordVersion';
import { useTranslationTabs } from '@/hooks/useTranslationTabs';
import { useVersionConflictDialog } from '@/hooks/useVersionConflictDialog';
import { isVersionConflict } from '@/utils/httpError';
import { queryClient } from '@/utils/query-client';
import { convertToSlug } from '@/utils/slug';

type TagFormDialogProps = {
   open: boolean;
   onClose: () => void;
   tag?: TagEntity;
};

export const TagFormDialog = ({ open, onClose, tag }: TagFormDialogProps) => {
   const { t } = useTranslation();
   const isEdit = !!tag;
   const canSave = usePermission('tags', isEdit ? 'update' : 'create');
   const readOnly = !canSave;

   const createTag = useMutation(api.tags.mutations.create);
   const updateTag = useMutation(api.tags.mutations.update);

   const [isSlugLocked, setIsSlugLocked] = useState(isEdit);
   const [isSlugManual, setIsSlugManual] = useState(false);

   const methods = useForm<TagFormValues>({
      resolver: zodResolver(tagSchema),
      defaultValues: buildDefaultValues(tag),
   });
   const recordVersion = useRecordVersion(tag, methods.formState.isDirty);
   const conflict = useVersionConflictDialog(async () => {
      if (!tag) return;
      const current = await queryClient.fetchQuery({
         ...api.tags.queries.detail(tag.id),
         staleTime: 0,
      });
      methods.reset(buildDefaultValues(current));
      recordVersion.adopt(current);
   });
   const tabs = useTranslationTabs(methods.control, createEmptyTranslation);

   useEntityFormSync(tag, methods, buildDefaultValues);

   const handleNameChange = (value: string) => {
      if (tabs.activeLanguage === 'cs' && !isSlugLocked && !isSlugManual) {
         methods.setValue('slug', convertToSlug(value));
      }
   };

   const handleSave = (values: TagFormValues) => {
      const payload = toSaveTagDto(values);

      if (!isEdit) {
         createTag.mutate(
            { data: payload },
            {
               onSuccess: () => {
                  toast.success(t('tags.toast.created'));
                  onClose();
               },
            },
         );
      } else {
         updateTag.mutate(
            { id: tag.id, data: { ...payload, version: recordVersion.version } },
            {
               onSuccess: () => {
                  toast.success(t('tags.toast.saved'));
                  onClose();
               },
               onError: (error) => {
                  if (isVersionConflict(error)) conflict.show();
               },
            },
         );
      }
   };

   const nameHintKey = tabs.languages.includes('en')
      ? (`tags.form.nameHint.${tabs.activeLanguage}` as const)
      : ('tags.form.nameHint.all' as const);

   const isSaving = createTag.isPending || updateTag.isPending;

   return (
      <FormDialog open={open} onClose={onClose} title={isEdit ? t('tags.edit') : t('tags.create')}>
         <FormProvider {...methods}>
            <form
               onSubmit={methods.handleSubmit(handleSave, tabs.handleInvalid)}
               className="space-y-4"
            >
               {readOnly && <ReadOnlyNotice message={t('common.readOnly.permission')} />}
               {tag && <EditLockBanner entity="tags" id={tag.id} readOnly={readOnly} />}
               <NewerVersionNotice
                  visible={recordVersion.hasNewer && !readOnly}
                  onReload={() => void conflict.reload()}
                  isReloading={conflict.dialogProps.isReloading}
               />
               <fieldset disabled={readOnly} className="min-w-0 space-y-4">
                  <LanguageSelector
                     languages={tabs.languages}
                     activeLanguage={tabs.activeLanguage}
                     onLanguageChange={tabs.setActiveLanguage}
                     onAddLanguage={tabs.add}
                     removableLanguages={tabs.removableLanguages}
                     onRemoveLanguage={tabs.remove}
                     disabled={isSaving || readOnly}
                  />

                  <FormInput
                     key={tabs.activeLanguage}
                     name={`translations.${tabs.index}.name`}
                     label={t('tags.form.nameInLanguage', {
                        language: t(`common.language.${tabs.activeLanguage}`),
                     })}
                     description={t(nameHintKey)}
                     autoFocus
                     onChange={(e) => handleNameChange(e.target.value)}
                  />

                  <FormLockableInput
                     name="slug"
                     label={t('tags.form.slug')}
                     isLocked={isSlugLocked}
                     onToggleLock={() => setIsSlugLocked((prev) => !prev)}
                     lockedLabel={t('tags.form.slugLocked')}
                     unlockedLabel={t('tags.form.slugUnlocked')}
                     onValueChange={() => setIsSlugManual(true)}
                  />

                  <FormColorInput
                     name="color"
                     label={t('tags.form.color')}
                     placeholder={t('tags.form.colorPlaceholder')}
                  />
               </fieldset>

               <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                     {readOnly ? t('common.close') : t('common.cancel')}
                  </Button>
                  {!readOnly && (
                     <Button type="submit" disabled={isSaving}>
                        {isSaving ? t('common.loading') : t('tags.form.save')}
                     </Button>
                  )}
               </DialogFooter>
            </form>
         </FormProvider>
         <VersionConflictDialog {...conflict.dialogProps} />
      </FormDialog>
   );
};
