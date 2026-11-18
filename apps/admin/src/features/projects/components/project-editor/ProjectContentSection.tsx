import { useTranslation } from 'react-i18next';

import type { FileEntity } from '@/api/generated';
import { FormSection } from '@/components/common/FormSection';
import { FormInput } from '@/features/form/components/FormInput';
import { FormRichText } from '@/features/form/components/FormRichText';
import { FormTextarea } from '@/features/form/components/FormTextarea';
import { ProjectMediaSection } from '@/features/projects/components/ProjectMediaSection';

type ProjectContentSectionProps = {
   translationIndex: number;
   onTitleChange?: (title: string) => void;
   readOnly?: boolean;
   mediaFiles: ReadonlyMap<number, FileEntity>;
};

export const ProjectContentSection = ({
   translationIndex,
   onTitleChange,
   readOnly = false,
   mediaFiles,
}: ProjectContentSectionProps) => {
   const { t } = useTranslation();
   const translation = `translations.${translationIndex}` as const;

   return (
      <FormSection title={t('projects.form.sections.content')}>
         <FormInput
            name={`${translation}.title`}
            label={t('projects.form.title')}
            onChange={(e) => onTitleChange?.(e.target.value)}
         />

         <FormTextarea
            name={`${translation}.description`}
            label={t('projects.form.description')}
            rows={3}
         />

         <FormRichText
            name={`${translation}.content`}
            label={t('projects.form.content')}
            disabled={readOnly}
         />

         <ProjectMediaSection savedFiles={mediaFiles} />
      </FormSection>
   );
};
