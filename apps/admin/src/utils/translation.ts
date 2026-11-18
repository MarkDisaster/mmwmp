type TranslatedEntity = {
   translations: ReadonlyArray<{ language: string; title: string }>;
};

export const getTranslationTitle = (entity: TranslatedEntity, language?: string): string => {
   const baseLanguage = language?.split('-')[0];
   const translation =
      entity.translations.find((tr) => tr.language === baseLanguage) ?? entity.translations[0];
   return translation?.title ?? '—';
};

export type GeneratedTranslation<TField extends string> = Partial<Record<TField, string | null>>;

export const getGeneratedFields = <TField extends string>(
   generated: GeneratedTranslation<TField>,
   fields: readonly TField[],
): Partial<Record<TField, string>> => {
   const filled: Partial<Record<TField, string>> = {};
   for (const field of fields) {
      const value = generated[field];
      if (value) filled[field] = value;
   }
   return filled;
};

export const mergeGeneratedTranslation = <
   TTranslation extends Partial<Record<TField, string>>,
   TField extends string,
>(
   translation: TTranslation,
   generated: GeneratedTranslation<TField>,
   fields: readonly TField[],
): TTranslation => ({ ...translation, ...getGeneratedFields(generated, fields) });

export const getRemovableLanguages = <TLanguage extends string>(
   languages: readonly TLanguage[],
   savedLanguages: readonly TLanguage[],
   primaryLanguage: TLanguage,
): TLanguage[] =>
   languages.filter(
      (language) => language !== primaryLanguage && !savedLanguages.includes(language),
   );

export const getLanguageToShowErrors = <TLanguage extends string>(
   languages: readonly TLanguage[],
   activeLanguage: TLanguage,
   translationErrors: unknown,
): TLanguage => {
   const errors: unknown[] = Array.isArray(translationErrors) ? translationErrors : [];
   if (errors[languages.indexOf(activeLanguage)]) return activeLanguage;
   return languages.find((_, index) => errors[index]) ?? activeLanguage;
};
