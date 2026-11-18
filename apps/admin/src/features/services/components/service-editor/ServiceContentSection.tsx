import { useTranslation } from 'react-i18next';

import { FormSection } from '@/components/common/FormSection';
import { FormInput } from '@/features/form/components/FormInput';
import { FormRichText } from '@/features/form/components/FormRichText';
import { FormTextarea } from '@/features/form/components/FormTextarea';

type ServiceContentSectionProps = {
   translationIndex: number;
   onTitleChange?: (title: string) => void;
   readOnly?: boolean;
};

export const ServiceContentSection = ({
   translationIndex,
   onTitleChange,
   readOnly = false,
}: ServiceContentSectionProps) => {
   const { t } = useTranslation();
   const translation = `translations.${translationIndex}` as const;

   return (
      <FormSection title={t('services.form.sections.content')}>
         <FormInput
            name={`${translation}.title`}
            label={t('services.form.title')}
            onChange={(e) => onTitleChange?.(e.target.value)}
         />

         <FormTextarea
            name={`${translation}.description`}
            label={t('services.form.description')}
            rows={3}
         />

         <FormRichText
            name={`${translation}.content`}
            label={t('services.form.content')}
            disabled={readOnly}
         />
      </FormSection>
   );
};
