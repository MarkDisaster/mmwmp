import { useState } from 'react';
import type { Control, FieldErrors } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { SUPPORTED_LANGUAGES } from '@/i18n/constants';
import { getLanguageToShowErrors, getRemovableLanguages } from '@/utils/translation';

type Language = (typeof SUPPORTED_LANGUAGES)[number];

type TranslatableValues = { translations: { language: Language }[] };

const DEFAULT_LANGUAGE: Language = 'cs';

export const useTranslationTabs = <TValues extends TranslatableValues>(
   control: Control<TValues>,
   createEmpty: (language: Language) => TValues['translations'][number],
   savedLanguages: readonly Language[] = [],
) => {
   const { t } = useTranslation();
   const {
      fields,
      append,
      remove: removeRow,
   } = useFieldArray({
      control: control as unknown as Control<TranslatableValues>,
      name: 'translations',
   });
   const languages = fields.map((field) => field.language);
   const removableLanguages = getRemovableLanguages(languages, savedLanguages, DEFAULT_LANGUAGE);
   const [selectedLanguage, setActiveLanguage] = useState<Language>(DEFAULT_LANGUAGE);
   const activeLanguage = languages.includes(selectedLanguage) ? selectedLanguage : languages[0];
   const index = Math.max(languages.indexOf(activeLanguage), 0);

   const add = (
      language: Language,
      values: TValues['translations'][number] = createEmpty(language),
   ) => {
      append(values);
      setActiveLanguage(language);
   };

   const remove = (language: Language) => {
      if (removableLanguages.includes(language)) removeRow(languages.indexOf(language));
   };

   const handleInvalid = (errors: FieldErrors<TranslatableValues>) => {
      const language = getLanguageToShowErrors(languages, activeLanguage, errors.translations);
      setActiveLanguage(language);
      toast.error(
         language === activeLanguage
            ? t('common.formInvalid')
            : t('common.formInvalidLanguage', { language: t(`common.language.${language}`) }),
      );
   };

   return {
      languages,
      activeLanguage,
      setActiveLanguage,
      index,
      add,
      removableLanguages,
      remove,
      handleInvalid,
   };
};
