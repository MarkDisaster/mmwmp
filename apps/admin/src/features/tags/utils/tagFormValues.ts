import type { CreateTagDto, TagEntity } from '@/api/generated';
import { DEFAULT_TAG_COLOR } from '@/features/tags/constants';
import type { TagFormValues, TagTranslationFormValues } from '@/features/tags/validation/tagSchema';

export const createEmptyTranslation = (
   language: TagTranslationFormValues['language'],
): TagTranslationFormValues => ({ language, name: '' });

export const buildDefaultValues = (tag?: TagEntity): TagFormValues => ({
   slug: tag?.slug ?? '',
   color: tag?.color ?? DEFAULT_TAG_COLOR,
   translations: tag?.translations.length
      ? tag.translations.map(({ language, name }) => ({ language, name }))
      : [createEmptyTranslation('cs')],
});

export const toSaveTagDto = (values: TagFormValues): CreateTagDto => ({
   slug: values.slug,
   color: values.color || undefined,
   translations: values.translations.map(({ language, name }) => ({ language, name: name.trim() })),
});
