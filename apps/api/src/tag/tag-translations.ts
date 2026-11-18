import { BadRequestException } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';
import { Language } from '@/generated/prisma/enums';

export const TAG_TRANSLATIONS_SELECT = {
   select: { language: true, name: true },
   orderBy: { language: Prisma.SortOrder.asc },
} satisfies Prisma.Tag$translationsArgs;

export type TagTranslationInput = { language: Language; name: string };

export const pickTagTranslations = (translations: TagTranslationInput[]): TagTranslationInput[] => {
   const languages = new Set<Language>();
   for (const translation of translations) {
      if (languages.has(translation.language)) {
         throw new BadRequestException(`Translation ${translation.language} is listed twice`);
      }
      languages.add(translation.language);
   }

   const applied = translations
      .map((translation) => ({ language: translation.language, name: translation.name.trim() }))
      .filter((translation) => translation.name.length > 0);
   if (!applied.some((translation) => translation.language === Language.cs)) {
      throw new BadRequestException('The Czech (cs) name of the tag is required');
   }
   return applied;
};

type Named = { translations: { language: Language; name: string }[] };

export const toToolNames = (tag: Named) => ({
   cs: tag.translations.find((translation) => translation.language === Language.cs)?.name ?? '',
   en: tag.translations.find((translation) => translation.language === Language.en)?.name ?? null,
});

export const tagName = (tag: Named, language: Language = Language.cs): string =>
   tag.translations.find((translation) => translation.language === language)?.name ??
   tag.translations.find((translation) => translation.language === Language.cs)?.name ??
   tag.translations[0]?.name ??
   '';
