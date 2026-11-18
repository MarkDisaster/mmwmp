import { z } from 'zod';

import { MAX_TAG_NAME_LENGTH } from '../tag.constants';
import { tagName, toToolNames } from '../tag-translations';

export const tagNameInputSchema = z.object({
   language: z
      .enum(['cs', 'en'])
      .describe('`cs` (Czech, required for every tag) or `en` (English).'),
   name: z
      .string()
      .trim()
      .min(1)
      .max(MAX_TAG_NAME_LENGTH)
      .describe('The tag name in that language, e.g. "Případová studie" (cs) / "Case study" (en).'),
});

type ToolTag = {
   id: number;
   slug: string;
   color: string | null;
   translations: { language: 'cs' | 'en'; name: string }[];
};

export const toToolTag = (tag: ToolTag) => ({
   id: tag.id,
   name: tagName(tag),
   names: toToolNames(tag),
   slug: tag.slug,
   color: tag.color,
});
