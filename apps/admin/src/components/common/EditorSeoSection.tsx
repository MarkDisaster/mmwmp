import { useTranslation } from 'react-i18next';

import { FormSection } from '@/components/common/FormSection';
import { FormInput } from '@/features/form/components/FormInput';
import { FormLockableInput } from '@/features/form/components/FormLockableInput';
import type { SlugAutofill } from '@/hooks/useSlugAutofill';

type EditorSeoSectionProps = {
   i18nPrefix: 'projects' | 'services';
   translationIndex: number;
   slug: SlugAutofill;
};

export const EditorSeoSection = ({ i18nPrefix, translationIndex, slug }: EditorSeoSectionProps) => {
   const { t } = useTranslation();
   const translation = `translations.${translationIndex}` as const;

   return (
      <FormSection title={t(`${i18nPrefix}.form.sections.seo`)}>
         <FormLockableInput
            name="slug"
            label={t(`${i18nPrefix}.form.slug`)}
            isLocked={slug.isLocked}
            onToggleLock={slug.toggleLock}
            lockedLabel={t(`${i18nPrefix}.form.slugLocked`)}
            unlockedLabel={t(`${i18nPrefix}.form.slugUnlocked`)}
            onValueChange={slug.markManual}
         />

         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
               name={`${translation}.metaTitle`}
               label={t(`${i18nPrefix}.form.metaTitle`)}
            />
            <FormInput
               name={`${translation}.metaDescription`}
               label={t(`${i18nPrefix}.form.metaDescription`)}
            />
         </div>
      </FormSection>
   );
};
