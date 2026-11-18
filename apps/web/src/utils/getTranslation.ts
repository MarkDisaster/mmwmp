export function getTranslation<T extends { language: string }>(
   entity: { translations: T[] },
   locale: string,
): T | undefined {
   return entity.translations.find((t) => t.language === locale) ?? entity.translations[0];
}
