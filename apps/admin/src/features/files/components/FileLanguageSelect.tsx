import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { updateFileDtoLanguageEnum, type UpdateFileDtoLanguageEnumKey } from '@/api/generated';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';

type FileLanguage = UpdateFileDtoLanguageEnumKey;

const FILE_LANGUAGES = Object.values(updateFileDtoLanguageEnum);

type TriggerProps = Pick<
   ComponentProps<typeof SelectTrigger>,
   'id' | 'aria-describedby' | 'aria-invalid'
>;

type FileLanguageSelectProps = TriggerProps & {
   value: FileLanguage | null;
   onChange: (value: FileLanguage | null) => void;
   disabled?: boolean;
};

const LANGUAGE_NONE = '__none__';

export const FileLanguageSelect = ({
   value,
   onChange,
   disabled,
   ...triggerProps
}: FileLanguageSelectProps) => {
   const { t } = useTranslation();

   return (
      <Select
         value={value ?? LANGUAGE_NONE}
         onValueChange={(selected) => onChange(FILE_LANGUAGES.find((l) => l === selected) ?? null)}
         disabled={disabled}
      >
         <SelectTrigger {...triggerProps}>
            <SelectValue placeholder={t('files.editDialog.languagePlaceholder')} />
         </SelectTrigger>
         <SelectContent>
            <SelectItem value={LANGUAGE_NONE}>{t('files.editDialog.noLanguage')}</SelectItem>
            {FILE_LANGUAGES.map((lang) => (
               <SelectItem key={lang} value={lang}>
                  {t(`common.language.${lang}`)}
               </SelectItem>
            ))}
         </SelectContent>
      </Select>
   );
};
