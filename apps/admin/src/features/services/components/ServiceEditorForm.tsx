import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import type { ServiceEntity } from '@/api/generated';
import { DeleteDialog } from '@/components/common/DeleteDialog';
import { EditLockBanner } from '@/components/common/EditLockBanner';
import { EditorFormActions } from '@/components/common/EditorFormActions';
import { EditorFormLayout } from '@/components/common/EditorFormLayout';
import { EditorSeoSection } from '@/components/common/EditorSeoSection';
import { LanguageSelector } from '@/components/common/LanguageSelector';
import { NewerVersionNotice } from '@/components/common/NewerVersionNotice';
import { PageHeader } from '@/components/common/PageHeader';
import { ReadOnlyNotice } from '@/components/common/ReadOnlyNotice';
import { StatusBadge } from '@/components/common/StatusBadge';
import { UnsavedChangesGuard } from '@/components/common/UnsavedChangesGuard';
import { VersionConflictDialog } from '@/components/common/VersionConflictDialog';
import { useGenerateServiceTranslation } from '@/features/services/hooks/useGenerateServiceTranslation';
import { useSaveService } from '@/features/services/hooks/useSaveService';
import {
   buildDefaultValues,
   createEmptyTranslation,
} from '@/features/services/utils/serviceFormValues';
import type { ServiceFormValues } from '@/features/services/validation/serviceSchema';
import { serviceSchema } from '@/features/services/validation/serviceSchema';
import { useEditLock } from '@/hooks/useEditLock';
import { useEntityEditorActions } from '@/hooks/useEntityEditorActions';
import { useEntityFormSync } from '@/hooks/useEntityFormSync';
import { usePermission } from '@/hooks/usePermission';
import { useSlugAutofill } from '@/hooks/useSlugAutofill';
import { useTranslationTabs } from '@/hooks/useTranslationTabs';

import { ServiceContentSection } from './service-editor/ServiceContentSection';
import { ServiceDetailsSidebar } from './service-editor/ServiceDetailsSidebar';

const FORM_ID = 'service-form';

type ServiceEditorFormProps = {
   service?: ServiceEntity;
};

export const ServiceEditorForm = ({ service }: ServiceEditorFormProps) => {
   const { t, i18n } = useTranslation();
   const navigate = useNavigate();
   const canPublish = usePermission('services', 'publish');
   const canDelete = usePermission('services', 'delete');
   const editLock = useEditLock('services', service);
   const readOnly = editLock !== null;
   const actions = useEntityEditorActions(service, {
      updateStatus: api.services.mutations.updateStatus,
      remove: api.services.mutations.remove,
      onDeleted: () => navigate({ to: '/services', ignoreBlocker: true }),
      detailKey: (id) => api.services.queries.detail(id).queryKey,
      messages: {
         unpublished: 'services.toast.unpublished',
         statusFailed: 'services.toast.statusFailed',
         deleted: 'services.toast.deleted',
         deleteFailed: 'services.toast.deleteFailed',
      },
   });
   const [showDeleteDialog, setShowDeleteDialog] = useState(false);

   const methods = useForm<ServiceFormValues>({
      resolver: zodResolver(serviceSchema),
      defaultValues: buildDefaultValues(service, i18n.language),
   });
   const { control, formState, setValue } = methods;
   const tabs = useTranslationTabs(
      control,
      createEmptyTranslation,
      service?.translations.map((tr) => tr.language),
   );
   const slug = useSlugAutofill(!!service, (value) =>
      setValue('slug', value, { shouldDirty: true, shouldValidate: formState.isSubmitted }),
   );
   const { save, conflictDialogProps, hasNewerVersion, reload, isReloading } = useSaveService(
      service,
      methods,
   );
   const translation = useGenerateServiceTranslation(service?.id, methods, tabs);

   useEntityFormSync(service, methods, (refreshed) => buildDefaultValues(refreshed, i18n.language));

   const submit = (publish: boolean) =>
      methods.handleSubmit((values) => save(values, { publish }), tabs.handleInvalid);

   return (
      <>
         <FormProvider {...methods}>
            <EditorFormLayout
               formId={FORM_ID}
               onSubmit={submit(false)}
               disabled={formState.isSubmitting || readOnly}
               notice={
                  <>
                     {editLock && <ReadOnlyNotice message={t(`common.readOnly.${editLock}`)} />}
                     {service && (
                        <EditLockBanner entity="services" id={service.id} readOnly={readOnly} />
                     )}
                     <NewerVersionNotice
                        visible={hasNewerVersion && !readOnly}
                        onReload={() => void reload()}
                        isReloading={isReloading}
                     />
                  </>
               }
               header={
                  <PageHeader
                     title={service ? t('services.edit') : t('services.create')}
                     badge={
                        service && (
                           <StatusBadge
                              status={service.status}
                              label={t(`services.status.${service.status}`)}
                           />
                        )
                     }
                     actions={
                        <EditorFormActions
                           isDraft={!service || service.status === 'draft'}
                           isSaving={formState.isSubmitting || actions.isUnpublishing}
                           disabled={translation.pendingLanguage !== undefined}
                           canPublish={canPublish}
                           readOnly={readOnly}
                           formId={FORM_ID}
                           onPublish={submit(true)}
                           onUnpublish={actions.unpublish}
                           labels={{
                              saveDraft: t('services.form.saveDraft'),
                              publish: t('services.form.publish'),
                              unpublish: t('services.form.unpublish'),
                              save: t('services.form.save'),
                           }}
                        />
                     }
                  />
               }
               toolbar={
                  <LanguageSelector
                     languages={tabs.languages}
                     activeLanguage={tabs.activeLanguage}
                     onLanguageChange={tabs.setActiveLanguage}
                     onAddLanguage={tabs.add}
                     removableLanguages={tabs.removableLanguages}
                     onRemoveLanguage={tabs.remove}
                     onGenerateLanguage={service && translation.generate}
                     canGenerateAI={translation.canGenerate}
                     generatingLanguage={translation.pendingLanguage}
                     aiFormPrefix="services.form"
                     disabled={formState.isSubmitting || readOnly}
                  />
               }
               sidebar={
                  <ServiceDetailsSidebar
                     onDelete={
                        service && canDelete && !readOnly
                           ? () => setShowDeleteDialog(true)
                           : undefined
                     }
                  />
               }
            >
               <ServiceContentSection
                  translationIndex={tabs.index}
                  onTitleChange={tabs.activeLanguage === 'cs' ? slug.fillFromTitle : undefined}
                  readOnly={readOnly}
               />
               <EditorSeoSection i18nPrefix="services" translationIndex={tabs.index} slug={slug} />
            </EditorFormLayout>
         </FormProvider>

         <VersionConflictDialog {...conflictDialogProps} />
         <UnsavedChangesGuard when={formState.isDirty && !readOnly} />

         {service && (
            <DeleteDialog
               open={showDeleteDialog}
               onOpenChange={setShowDeleteDialog}
               onConfirm={actions.delete}
               isPending={actions.isDeleting}
               title={t('services.delete.title')}
               description={t('services.delete.description')}
               confirmLabel={t('services.delete.confirm')}
               cancelLabel={t('services.delete.cancel')}
            />
         )}
      </>
   );
};
