import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import {
   COMBOBOX_OPTIONS_LIMIT,
   type ComboboxOption,
   MultiSelectCombobox,
} from '@/components/common/MultiSelectCombobox';
import type { ProjectFormValues } from '@/features/projects/validation/projectSchema';
import { getTagName } from '@/utils/tag';

type SelectedTag = ProjectFormValues['tags'][number];

const toOption = (tag: SelectedTag): ComboboxOption => ({ id: tag.id, label: tag.name });
const toTag = (option: ComboboxOption): SelectedTag => ({ id: option.id, name: option.label });

export const ProjectTagSelect = () => {
   const { t, i18n } = useTranslation();
   const [open, setOpen] = useState(false);
   const { control } = useFormContext<ProjectFormValues>();
   const {
      field: { value: tags, onChange },
   } = useController({ control, name: 'tags' });
   const {
      data: tagsData,
      isLoading,
      isError,
   } = useQuery({
      ...api.tags.queries.all({ limit: COMBOBOX_OPTIONS_LIMIT }),
      enabled: open,
   });

   return (
      <MultiSelectCombobox
         label={t('projects.form.tags')}
         addLabel={t('projects.form.addTag')}
         searchPlaceholder={t('projects.form.searchTags')}
         removeLabel={t('projects.form.removeTag')}
         moveLabel={t('projects.form.moveTag')}
         selected={tags.map(toOption)}
         onChange={(options) => onChange(options.map(toTag))}
         options={(tagsData?.data ?? []).map((tag) => ({
            id: tag.id,
            label: getTagName(tag, i18n.language),
         }))}
         loading={isLoading}
         error={isError}
         totalCount={tagsData?.totalCount}
         open={open}
         onOpenChange={setOpen}
      />
   );
};
