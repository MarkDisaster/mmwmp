import type {
   GenerateServiceTranslationRequestDto,
   SaveServiceDto,
   SaveServiceDtoStatusEnumKey,
   SaveServiceTranslationDto,
   ServiceEntity,
} from '@/api/generated';
import type {
   ServiceFormValues,
   ServiceTranslationFormValues,
} from '@/features/services/validation/serviceSchema';
import { getTranslationTitle } from '@/utils/translation';

export const GENERATED_TRANSLATION_FIELDS = ['title', 'description', 'content'] as const;

export const createEmptyTranslation = (
   language: ServiceTranslationFormValues['language'],
): ServiceTranslationFormValues => ({
   language,
   title: '',
   description: '',
   content: '',
   metaTitle: '',
   metaDescription: '',
});

export const toGenerateTranslationDto = (
   source: ServiceTranslationFormValues,
): GenerateServiceTranslationRequestDto => ({
   title: source.title,
   description: source.description || null,
   content: source.content || null,
});

export const buildDefaultValues = (
   service?: ServiceEntity,
   language?: string,
): ServiceFormValues => ({
   slug: service?.slug ?? '',
   showOnHomepage: service?.showOnHomepage ?? false,
   projects:
      service?.projects.map((sp) => ({
         id: sp.project.id,
         title: getTranslationTitle(sp.project, language),
      })) ?? [],
   translations: service?.translations.length
      ? service.translations.map((tr) => ({
           language: tr.language,
           title: tr.title,
           description: tr.description ?? '',
           content: tr.content ?? '',
           metaTitle: tr.metaTitle ?? '',
           metaDescription: tr.metaDescription ?? '',
        }))
      : [createEmptyTranslation('cs')],
});

const toSaveTranslation = (tr: ServiceTranslationFormValues): SaveServiceTranslationDto => ({
   language: tr.language,
   title: tr.title,
   description: tr.description || null,
   content: tr.content || null,
   metaTitle: tr.metaTitle || null,
   metaDescription: tr.metaDescription || null,
});

export const toSaveServiceDto = (
   values: ServiceFormValues,
   { status }: { status?: SaveServiceDtoStatusEnumKey } = {},
): SaveServiceDto => ({
   slug: values.slug,
   showOnHomepage: values.showOnHomepage,
   translations: values.translations.map(toSaveTranslation),
   projectIds: values.projects.map((project) => project.id),
   ...(status && { status }),
});
