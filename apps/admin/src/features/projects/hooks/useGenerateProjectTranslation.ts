import type { UseFormReturn } from 'react-hook-form';

import { api } from '@/api';
import {
   createEmptyTranslation,
   GENERATED_TRANSLATION_FIELDS,
   toGenerateTranslationDto,
} from '@/features/projects/utils/projectFormValues';
import type {
   ProjectFormValues,
   TranslationFormValues,
} from '@/features/projects/validation/projectSchema';
import type { GenerateTranslationTabs } from '@/hooks/useGenerateTranslation';
import { useGenerateTranslation } from '@/hooks/useGenerateTranslation';

const MESSAGES = {
   generated: 'projects.toast.translationGenerated',
   failed: 'projects.toast.translationFailed',
};

export const useGenerateProjectTranslation = (
   projectId: number | undefined,
   form: Pick<UseFormReturn<ProjectFormValues>, 'control' | 'getValues' | 'setValue'>,
   tabs: GenerateTranslationTabs<TranslationFormValues>,
) =>
   useGenerateTranslation(projectId, form, tabs, {
      mutation: api.projects.mutations.generateTranslation,
      fields: GENERATED_TRANSLATION_FIELDS,
      createEmpty: createEmptyTranslation,
      toRequest: toGenerateTranslationDto,
      messages: MESSAGES,
   });
