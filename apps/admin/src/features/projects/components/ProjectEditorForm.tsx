import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import type { ProjectEntity } from '@/api/generated';
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
import { Button } from '@/components/ui/button';
import { useGenerateProjectTranslation } from '@/features/projects/hooks/useGenerateProjectTranslation';
import { useSaveProject } from '@/features/projects/hooks/useSaveProject';
import {
   buildDefaultValues,
   createEmptyTranslation,
   toMediaFiles,
} from '@/features/projects/utils/projectFormValues';
import type { ProjectFormValues } from '@/features/projects/validation/projectSchema';
import { projectSchema } from '@/features/projects/validation/projectSchema';
import { useEditLock } from '@/hooks/useEditLock';
import { useEntityEditorActions } from '@/hooks/useEntityEditorActions';
import { useEntityFormSync } from '@/hooks/useEntityFormSync';
import { usePermission } from '@/hooks/usePermission';
import { usePreviewUrl } from '@/hooks/usePreviewUrl';
import { useSlugAutofill } from '@/hooks/useSlugAutofill';
import { useTranslationTabs } from '@/hooks/useTranslationTabs';

import { ProjectContentSection } from './project-editor/ProjectContentSection';
import { ProjectDetailsSidebar } from './project-editor/ProjectDetailsSidebar';

const FORM_ID = 'project-form';

type ProjectEditorFormProps = {
   project?: ProjectEntity;
};

export const ProjectEditorForm = ({ project }: ProjectEditorFormProps) => {
   const { t, i18n } = useTranslation();
   const navigate = useNavigate();
   const openPreview = usePreviewUrl('projects');
   const canPublish = usePermission('projects', 'publish');
   const canDelete = usePermission('projects', 'delete');
   const editLock = useEditLock('projects', project);
   const readOnly = editLock !== null;
   const actions = useEntityEditorActions(project, {
      updateStatus: api.projects.mutations.updateStatus,
      remove: api.projects.mutations.remove,
      onDeleted: () => navigate({ to: '/projects', ignoreBlocker: true }),
      detailKey: (id) => api.projects.queries.detail(id).queryKey,
      messages: {
         unpublished: 'projects.toast.unpublished',
         statusFailed: 'projects.toast.statusFailed',
         deleted: 'projects.toast.deleted',
         deleteFailed: 'projects.toast.deleteFailed',
      },
   });
   const [showDeleteDialog, setShowDeleteDialog] = useState(false);

   const methods = useForm<ProjectFormValues>({
      resolver: zodResolver(projectSchema),
      defaultValues: buildDefaultValues(project, i18n.language),
   });
   const { control, formState, setValue } = methods;
   const tabs = useTranslationTabs(
      control,
      createEmptyTranslation,
      project?.translations.map((tr) => tr.language),
   );
   const slug = useSlugAutofill(!!project, (value) =>
      setValue('slug', value, { shouldDirty: true, shouldValidate: formState.isSubmitted }),
   );
   const { save, conflictDialogProps, hasNewerVersion, reload, isReloading } = useSaveProject(
      project,
      methods,
   );
   const mediaFiles = useMemo(() => toMediaFiles(project?.media), [project]);
   const translation = useGenerateProjectTranslation(project?.id, methods, tabs);

   useEntityFormSync(project, methods, (refreshed) => buildDefaultValues(refreshed, i18n.language));

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
                     {project && (
                        <EditLockBanner entity="projects" id={project.id} readOnly={readOnly} />
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
                     title={project ? t('projects.edit') : t('projects.create')}
                     badge={
                        project && (
                           <StatusBadge
                              status={project.status}
                              label={t(`projects.status.${project.status}`)}
                           />
                        )
                     }
                     actions={
                        <EditorFormActions
                           isDraft={!project || project.status === 'draft'}
                           isSaving={formState.isSubmitting || actions.isUnpublishing}
                           disabled={translation.pendingLanguage !== undefined}
                           canPublish={canPublish}
                           readOnly={readOnly}
                           formId={FORM_ID}
                           onPublish={submit(true)}
                           onUnpublish={actions.unpublish}
                           labels={{
                              saveDraft: t('projects.form.saveDraft'),
                              publish: t('projects.form.publish'),
                              unpublish: t('projects.form.unpublish'),
                              save: t('projects.form.save'),
                           }}
                           extraActions={
                              project && (
                                 <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => openPreview(project.id, tabs.activeLanguage)}
                                 >
                                    {t('projects.form.preview')}
                                 </Button>
                              )
                           }
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
                     onGenerateLanguage={project && translation.generate}
                     canGenerateAI={translation.canGenerate}
                     generatingLanguage={translation.pendingLanguage}
                     aiFormPrefix="projects.form"
                     disabled={formState.isSubmitting || readOnly}
                  />
               }
               sidebar={
                  <ProjectDetailsSidebar
                     translationIndex={tabs.index}
                     onDelete={
                        project && canDelete && !readOnly
                           ? () => setShowDeleteDialog(true)
                           : undefined
                     }
                  />
               }
            >
               <ProjectContentSection
                  translationIndex={tabs.index}
                  mediaFiles={mediaFiles}
                  onTitleChange={tabs.activeLanguage === 'cs' ? slug.fillFromTitle : undefined}
                  readOnly={readOnly}
               />
               <EditorSeoSection i18nPrefix="projects" translationIndex={tabs.index} slug={slug} />
            </EditorFormLayout>
         </FormProvider>

         <VersionConflictDialog {...conflictDialogProps} />
         <UnsavedChangesGuard when={formState.isDirty && !readOnly} />

         {project && (
            <DeleteDialog
               open={showDeleteDialog}
               onOpenChange={setShowDeleteDialog}
               onConfirm={actions.delete}
               isPending={actions.isDeleting}
               title={t('projects.delete.title')}
               description={t('projects.delete.description')}
               confirmLabel={t('projects.delete.confirm')}
               cancelLabel={t('projects.delete.cancel')}
            />
         )}
      </>
   );
};
