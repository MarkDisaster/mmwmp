import { useTranslation } from 'react-i18next';

import { FormSection } from '@/components/common/FormSection';
import { Button } from '@/components/ui/button';
import { FormCheckbox } from '@/features/form/components/FormCheckbox';
import { ServiceProjectSelect } from '@/features/services/components/ServiceProjectSelect';

type ServiceDetailsSidebarProps = {
   onDelete?: () => void;
};

export const ServiceDetailsSidebar = ({ onDelete }: ServiceDetailsSidebarProps) => {
   const { t } = useTranslation();

   return (
      <>
         <FormSection title={t('services.form.sections.properties')}>
            <ServiceProjectSelect />
            <FormCheckbox name="showOnHomepage" label={t('services.form.showOnHomepage')} />
         </FormSection>

         {onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete}>
               {t('services.delete.title')}
            </Button>
         )}
      </>
   );
};
