import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormSection } from '@/components/common/FormSection';
import { Button } from '@/components/ui/button';
import { FormCheckbox } from '@/features/form/components/FormCheckbox';
import { FormInput } from '@/features/form/components/FormInput';
import { ProjectLinksSection } from '@/features/projects/components/ProjectLinksSection';
import { ProjectTagSelect } from '@/features/projects/components/ProjectTagSelect';
import { ProjectThumbnailSection } from '@/features/projects/components/ProjectThumbnailSection';
import type { ProjectFormValues } from '@/features/projects/validation/projectSchema';

type ProjectDetailsSidebarProps = {
   translationIndex: number;
   onDelete?: () => void;
};

export const ProjectDetailsSidebar = ({
   translationIndex,
   onDelete,
}: ProjectDetailsSidebarProps) => {
   const { t } = useTranslation();
   const { control, setValue } = useFormContext<ProjectFormValues>();
   const ongoing = useWatch({ control, name: 'ongoing' });

   useEffect(() => {
      if (ongoing) setValue('endYear', '', { shouldDirty: true });
   }, [ongoing, setValue]);

   return (
      <>
         <FormSection title={t('projects.form.sections.detail')}>
            <ProjectThumbnailSection />
            <ProjectTagSelect />
            <FormCheckbox name="showOnHomepage" label={t('projects.form.showOnHomepage')} />
         </FormSection>

         <FormSection title={t('projects.form.sections.details')}>
            <FormInput
               name={`translations.${translationIndex}.role`}
               label={t('projects.form.role')}
            />
            <FormInput name="company" label={t('projects.form.company')} />
            <div className="grid grid-cols-2 gap-4">
               <FormInput
                  name="startYear"
                  label={t('projects.form.startYear')}
                  inputMode="numeric"
                  maxLength={4}
               />
               <FormInput
                  name="endYear"
                  label={t('projects.form.endYear')}
                  inputMode="numeric"
                  maxLength={4}
                  disabled={ongoing}
               />
            </div>
            <FormCheckbox name="ongoing" label={t('projects.form.ongoing')} />
            <ProjectLinksSection />
         </FormSection>

         {onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete}>
               {t('projects.delete.title')}
            </Button>
         )}
      </>
   );
};
