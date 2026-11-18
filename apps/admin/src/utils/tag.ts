type TranslatedTag = {
   translations: ReadonlyArray<{ language: string; name: string }>;
};

export const getTagName = (tag: TranslatedTag, language?: string): string => {
   const baseLanguage = language?.split('-')[0];
   const named = (code?: string) => tag.translations.find((tr) => tr.language === code)?.name;
   return named(baseLanguage) ?? named('cs') ?? tag.translations[0]?.name ?? '—';
};
