import { useNavigate } from '@tanstack/react-router';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import type { ProjectEntity } from '@/api/generated';
import { buildDefaultValues, toSaveProjectDto } from '@/features/projects/utils/projectFormValues';
import type { ProjectFormValues } from '@/features/projects/validation/projectSchema';
import { useAggregateSave } from '@/hooks/useAggregateSave';
import { queryClient } from '@/utils/query-client';
import type { SaveFailure } from '@/utils/saveFailure';

const MESSAGES = {
   failure: {
      slugTaken: 'projects.validation.slugTaken',
      conflict: 'projects.toast.saveConflict',
      invalid: 'projects.toast.saveInvalid',
      forbidden: 'projects.toast.saveForbidden',
      missing: 'projects.toast.saveMissing',
      failed: 'projects.toast.error',
   } satisfies Record<Exclude<SaveFailure, 'versionConflict'>, string>,
   created: 'projects.toast.created',
   saved: 'projects.toast.saved',
   published: 'projects.toast.published',
};

export const useSaveProject = (
   project: ProjectEntity | undefined,
   form: Pick<UseFormReturn<ProjectFormValues>, 'reset' | 'setError' | 'formState'>,
) => {
   const navigate = useNavigate();
   const { i18n } = useTranslation();

   return useAggregateSave(project, form, {
      saveNew: api.projects.mutations.saveNew,
      saveExisting: api.projects.mutations.saveExisting,
      toDto: toSaveProjectDto,
      toValues: (saved) => buildDefaultValues(saved, i18n.language),
      openCreated: (saved) =>
         navigate({
            to: '/projects/$projectId',
            params: { projectId: saved.id },
            replace: true,
            ignoreBlocker: true,
         }),
      fetchCurrent: (id) =>
         queryClient.fetchQuery({ ...api.projects.queries.detail(id), staleTime: 0 }),
      messages: MESSAGES,
   });
};
