import { useNavigate } from '@tanstack/react-router';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import type { ServiceEntity } from '@/api/generated';
import { buildDefaultValues, toSaveServiceDto } from '@/features/services/utils/serviceFormValues';
import type { ServiceFormValues } from '@/features/services/validation/serviceSchema';
import { useAggregateSave } from '@/hooks/useAggregateSave';
import { queryClient } from '@/utils/query-client';
import type { SaveFailure } from '@/utils/saveFailure';

const MESSAGES = {
   failure: {
      slugTaken: 'services.validation.slugTaken',
      conflict: 'services.toast.saveConflict',
      invalid: 'services.toast.saveInvalid',
      forbidden: 'services.toast.saveForbidden',
      missing: 'services.toast.saveMissing',
      failed: 'services.toast.error',
   } satisfies Record<Exclude<SaveFailure, 'versionConflict'>, string>,
   created: 'services.toast.created',
   saved: 'services.toast.updated',
   published: 'services.toast.published',
};

export const useSaveService = (
   service: ServiceEntity | undefined,
   form: Pick<UseFormReturn<ServiceFormValues>, 'reset' | 'setError' | 'formState'>,
) => {
   const { i18n } = useTranslation();
   const navigate = useNavigate();

   return useAggregateSave(service, form, {
      saveNew: api.services.mutations.saveNew,
      saveExisting: api.services.mutations.saveExisting,
      toDto: toSaveServiceDto,
      toValues: (saved) => buildDefaultValues(saved, i18n.language),
      openCreated: (saved) =>
         navigate({
            to: '/services/$serviceId',
            params: { serviceId: saved.id },
            replace: true,
            ignoreBlocker: true,
         }),
      fetchCurrent: (id) =>
         queryClient.fetchQuery({ ...api.services.queries.detail(id), staleTime: 0 }),
      messages: MESSAGES,
   });
};
