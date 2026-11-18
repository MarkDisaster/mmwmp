import { z } from 'zod';

import { updateFileDtoLanguageEnum } from '@/api/generated';
import updateFileDto from '@/api/generated/schemas/updateFileDto.json';

export const MAX_DISPLAY_NAME_LENGTH = updateFileDto.properties.displayName.maxLength;
export const MAX_ALT_TEXT_LENGTH = updateFileDto.properties.altText.maxLength;

export const fileEditSchema = z.object({
   displayName: z.string().trim().max(MAX_DISPLAY_NAME_LENGTH),
   altText: z.string().trim().max(MAX_ALT_TEXT_LENGTH),
   language: z.enum(updateFileDtoLanguageEnum).nullable(),
});

export type FileEditFormValues = z.infer<typeof fileEditSchema>;
