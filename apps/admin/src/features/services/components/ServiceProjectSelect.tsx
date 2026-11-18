import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useController, useFormContext, useFormState } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import {
   COMBOBOX_OPTIONS_LIMIT,
   type ComboboxOption,
   MultiSelectCombobox,
} from '@/components/common/MultiSelectCombobox';
import type { ServiceFormValues } from '@/features/services/validation/serviceSchema';
import { getTranslationTitle } from '@/utils/translation';

type SelectedProject = ServiceFormValues['projects'][number];

const toOption = (project: SelectedProject): ComboboxOption => ({
   id: project.id,
   label: project.title,
});
const toProject = (option: ComboboxOption): SelectedProject => ({
   id: option.id,
   title: option.label,
});

export const ServiceProjectSelect = () => {
   const { t, i18n } = useTranslation();
   const [open, setOpen] = useState(false);
   const { control } = useFormContext<ServiceFormValues>();
   const { isSubmitting } = useFormState({ control });
   const {
      field: { value: projects, onChange },
   } = useController({ control, name: 'projects' });
   const {
      data: projectsData,
      isLoading,
      isError,
   } = useQuery({
      ...api.projects.queries.all({ limit: COMBOBOX_OPTIONS_LIMIT }),
      enabled: open,
   });

   return (
      <MultiSelectCombobox
         label={t('services.form.projects')}
         addLabel={t('services.form.addProject')}
         searchPlaceholder={t('services.form.searchProjects')}
         removeLabel={t('services.form.removeProject')}
         selected={projects.map(toOption)}
         onChange={(options) => onChange(options.map(toProject))}
         options={(projectsData?.data ?? []).map((project) => ({
            id: project.id,
            label: getTranslationTitle(project, i18n.language),
         }))}
         loading={isLoading}
         error={isError}
         totalCount={projectsData?.totalCount}
         open={open}
         onOpenChange={setOpen}
         disabled={isSubmitting}
         keepEmptyBadgeRow
      />
   );
};
