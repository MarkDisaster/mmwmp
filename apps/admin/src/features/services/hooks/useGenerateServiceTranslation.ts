import type { UseFormReturn } from 'react-hook-form';

import { api } from '@/api';
import {
   createEmptyTranslation,
   GENERATED_TRANSLATION_FIELDS,
   toGenerateTranslationDto,
} from '@/features/services/utils/serviceFormValues';
import type {
   ServiceFormValues,
   ServiceTranslationFormValues,
} from '@/features/services/validation/serviceSchema';
import type { GenerateTranslationTabs } from '@/hooks/useGenerateTranslation';
import { useGenerateTranslation } from '@/hooks/useGenerateTranslation';

const MESSAGES = {
   generated: 'services.toast.translationGenerated',
   failed: 'services.toast.translationFailed',
};

export const useGenerateServiceTranslation = (
   serviceId: number | undefined,
   form: Pick<UseFormReturn<ServiceFormValues>, 'control' | 'getValues' | 'setValue'>,
   tabs: GenerateTranslationTabs<ServiceTranslationFormValues>,
) =>
   useGenerateTranslation(serviceId, form, tabs, {
      mutation: api.services.mutations.generateTranslation,
      fields: GENERATED_TRANSLATION_FIELDS,
      createEmpty: createEmptyTranslation,
      toRequest: toGenerateTranslationDto,
      messages: MESSAGES,
   });
