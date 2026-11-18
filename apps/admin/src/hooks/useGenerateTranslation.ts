import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { SUPPORTED_LANGUAGES } from '@/i18n/constants';
import type { GeneratedTranslation } from '@/utils/translation';
import { getGeneratedFields, mergeGeneratedTranslation } from '@/utils/translation';

type Language = (typeof SUPPORTED_LANGUAGES)[number];

type TranslationRow = { language: Language; title: string };

type TranslationRowsForm = {
   translations: (TranslationRow & Partial<Record<string, string>>)[];
};

export type GenerateTranslationTabs<TTranslation> = {
   languages: Language[];
   add: (language: Language, values: TTranslation) => void;
   setActiveLanguage: (language: Language) => void;
};

type GenerateTranslationConfig<TTranslation, TField extends string, TRequest, TResult> = {
   mutation: UseMutationOptions<TResult, Error, { id: number; language: Language; data: TRequest }>;
   fields: readonly TField[];
   createEmpty: (language: Language) => TTranslation;
   toRequest: (source: TTranslation) => NoInfer<TRequest>;
   messages: { generated: string; failed: string };
};

export const useGenerateTranslation = <
   TValues extends { translations: TTranslation[] },
   TTranslation extends TranslationRow & Partial<Record<string, string>>,
   TField extends keyof TTranslation & string,
   TRequest,
   TResult extends GeneratedTranslation<TField>,
>(
   entityId: number | undefined,
   form: Pick<UseFormReturn<TValues>, 'control' | 'getValues' | 'setValue'>,
   tabs: GenerateTranslationTabs<TTranslation>,
   {
      mutation,
      fields,
      createEmpty,
      toRequest,
      messages,
   }: GenerateTranslationConfig<TTranslation, TField, TRequest, TResult>,
) => {
   const { t } = useTranslation();
   const generateTranslation = useMutation(mutation);
   const rowsForm = form as unknown as Pick<
      UseFormReturn<TranslationRowsForm>,
      'control' | 'setValue'
   >;
   const sourceIndex = tabs.languages.indexOf('cs');
   const sourceTitle = useWatch({
      control: rowsForm.control,
      name: `translations.${sourceIndex}.title`,
      defaultValue: '',
   });

   const generate = async (language: Language) => {
      const source = form.getValues().translations[sourceIndex];
      if (entityId === undefined || !source) return;

      let generated;
      try {
         generated = await generateTranslation.mutateAsync({
            id: entityId,
            language,
            data: toRequest(source),
         });
      } catch {
         toast.error(t(messages.failed));
         return;
      }

      const index = form.getValues().translations.findIndex((tr) => tr.language === language);
      if (index < 0) {
         tabs.add(language, mergeGeneratedTranslation(createEmpty(language), generated, fields));
      } else {
         const filled = getGeneratedFields(generated, fields);
         for (const field of fields) {
            const value = filled[field];
            const path: `translations.${number}.${string}` = `translations.${index}.${field}`;
            if (value) rowsForm.setValue(path, value, { shouldDirty: true });
         }
         tabs.setActiveLanguage(language);
      }
      toast.success(t(messages.generated));
   };

   return {
      canGenerate: entityId !== undefined && sourceIndex >= 0 && sourceTitle.trim().length > 0,
      generate,
      pendingLanguage: generateTranslation.isPending
         ? generateTranslation.variables?.language
         : undefined,
   };
};
