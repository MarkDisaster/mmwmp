import { BadRequestException } from '@nestjs/common';

import type { Language } from '@/generated/prisma/enums';

import type { SaveProjectMediaItemDto, SaveProjectTranslationDto } from './dto/save-project.dto';

export const assertYearRange = (
   startYear: number | null,
   endYear: number | null,
   ongoing = false,
): void => {
   if (startYear !== null && endYear !== null && endYear < startYear) {
      throw new BadRequestException('endYear must not be before startYear');
   }
   if (startYear === null && endYear !== null) {
      throw new BadRequestException('endYear requires startYear');
   }
   if (ongoing && startYear === null) {
      throw new BadRequestException('ongoing requires startYear');
   }
   if (ongoing && endYear !== null) {
      throw new BadRequestException(
         'ongoing project must not have endYear (send endYear: null, or ongoing: false)',
      );
   }
};

export const pickTranslations = (
   translations: SaveProjectTranslationDto[],
): SaveProjectTranslationDto[] => {
   const languages = new Set<Language>();
   for (const translation of translations) {
      if (languages.has(translation.language)) {
         throw new BadRequestException(`Translation ${translation.language} is listed twice`);
      }
      languages.add(translation.language);
   }

   const applied = translations.filter((translation) => translation.title.trim().length > 0);
   if (applied.length === 0) {
      throw new BadRequestException('At least one translation needs a title');
   }
   return applied;
};

export type MediaPlan = {
   removeIds: number[];
   keep: { id: number; sortOrder: number }[];
   create: { fileId: number; language: Language | null; sortOrder: number }[];
};

export const planMedia = (
   items: SaveProjectMediaItemDto[],
   existingIds: Iterable<number>,
): MediaPlan => {
   const existing = new Set(existingIds);
   const kept = new Set<number>();
   const plan: MediaPlan = { removeIds: [], keep: [], create: [] };

   items.forEach((item, sortOrder) => {
      if (item.id !== undefined) {
         if (item.fileId !== undefined || item.language !== undefined) {
            throw new BadRequestException(
               `Media ${item.id}: an item keeps an existing row (id) or adds a file (fileId, language), not both`,
            );
         }
         if (!existing.has(item.id)) {
            throw new BadRequestException(`Media ${item.id} not found in this project`);
         }
         if (kept.has(item.id)) {
            throw new BadRequestException(`Media ${item.id} is listed twice`);
         }
         kept.add(item.id);
         plan.keep.push({ id: item.id, sortOrder });
         return;
      }

      if (item.fileId === undefined) {
         throw new BadRequestException(`Media item ${sortOrder} needs an id or a fileId`);
      }
      plan.create.push({ fileId: item.fileId, language: item.language ?? null, sortOrder });
   });

   plan.removeIds = [...existing].filter((id) => !kept.has(id));
   return plan;
};
