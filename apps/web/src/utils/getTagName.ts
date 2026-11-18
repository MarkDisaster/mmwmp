type TranslatedTag = { translations?: { language: string; name: string }[] };

export function getTagName(tag: TranslatedTag, locale: string): string {
   const translations = tag.translations ?? [];
   const named = (language: string) => translations.find((t) => t.language === language)?.name;
   return named(locale) ?? named('cs') ?? translations[0]?.name ?? '';
}
