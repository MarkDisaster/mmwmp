import type {
   FileEntity,
   GenerateProjectTranslationRequestDto,
   ProjectEntity,
   ProjectMediaEntity,
   SaveProjectDto,
   SaveProjectDtoStatusEnumKey,
   SaveProjectMediaItemDto,
   SaveProjectTranslationDto,
} from '@/api/generated';
import { toFormLinks, toProjectLinks } from '@/features/projects/utils/projectLinks';
import type {
   MediaFormValues,
   ProjectFormValues,
   TranslationFormValues,
} from '@/features/projects/validation/projectSchema';
import { getTagName } from '@/utils/tag';

type ProjectMediaWithFile = ProjectMediaEntity & { file?: FileEntity };

export const GENERATED_TRANSLATION_FIELDS = [
   'title',
   'description',
   'content',
   'metaTitle',
   'metaDescription',
] as const;

export const toYear = (value: string) => (value === '' ? null : Number(value));

export const toProjectMeta = (values: ProjectFormValues) => ({
   company: values.company?.trim() || null,
   startYear: toYear(values.startYear),
   endYear: values.ongoing ? null : toYear(values.endYear),
   ongoing: values.ongoing,
});

export const createEmptyTranslation = (
   language: TranslationFormValues['language'],
): TranslationFormValues => ({
   language,
   title: '',
   role: '',
   description: '',
   content: '',
   metaTitle: '',
   metaDescription: '',
});

export const toGenerateTranslationDto = (
   source: TranslationFormValues,
): GenerateProjectTranslationRequestDto => ({
   title: source.title,
   description: source.description || null,
   content: source.content || null,
   metaTitle: source.metaTitle || null,
   metaDescription: source.metaDescription || null,
});

const toMediaFormValues = (item: ProjectMediaEntity): MediaFormValues => ({
   id: item.id,
   fileId: item.fileId,
   language: item.language,
});

export const toMediaFiles = (media: ProjectMediaWithFile[] = []): Map<number, FileEntity> =>
   new Map(media.flatMap((item) => (item.file ? [[item.fileId, item.file] as const] : [])));

type FileLanguageChange = {
   fileId: number;
   from: MediaFormValues['language'];
   to: MediaFormValues['language'];
};

export const withFileLanguage = (
   media: MediaFormValues[],
   savedMedia: readonly (Partial<MediaFormValues> | undefined)[],
   { fileId, from, to }: FileLanguageChange,
): MediaFormValues[] => {
   if (from === to) return media;
   const takenIds = new Set(media.map((item) => item.id));
   return media.map((item) => {
      if (item.fileId !== fileId || item.language !== from) return item;
      const savedId = savedMedia.find(
         (saved) =>
            saved?.fileId === fileId &&
            saved.language === to &&
            saved.id !== undefined &&
            !takenIds.has(saved.id),
      )?.id;
      if (savedId === undefined) return { fileId, language: to };
      takenIds.add(savedId);
      return { id: savedId, fileId, language: to };
   });
};

export const buildDefaultValues = (
   project?: ProjectEntity,
   language?: string,
): ProjectFormValues => ({
   company: project?.company ?? '',
   startYear: project?.startYear?.toString() ?? '',
   endYear: project?.endYear?.toString() ?? '',
   ongoing: project?.ongoing ?? false,
   links: toFormLinks(project?.links),
   slug: project?.slug ?? '',
   thumbnail: project?.thumbnail ?? null,
   tags: project?.tags.map((pt) => ({ id: pt.tag.id, name: getTagName(pt.tag, language) })) ?? [],
   showOnHomepage: project?.showOnHomepage ?? false,
   media: project?.media.map(toMediaFormValues) ?? [],
   translations: project?.translations.length
      ? project.translations.map((tr) => ({
           language: tr.language,
           title: tr.title,
           role: tr.role ?? '',
           description: tr.description ?? '',
           content: tr.content ?? '',
           metaTitle: tr.metaTitle ?? '',
           metaDescription: tr.metaDescription ?? '',
        }))
      : [createEmptyTranslation('cs')],
});

const toSaveTranslation = (tr: TranslationFormValues): SaveProjectTranslationDto => ({
   language: tr.language,
   title: tr.title,
   role: tr.role?.trim() || null,
   description: tr.description,
   content: tr.content,
   metaTitle: tr.metaTitle || null,
   metaDescription: tr.metaDescription || null,
});

const toSaveMediaItem = (item: MediaFormValues): SaveProjectMediaItemDto =>
   item.id === undefined ? { fileId: item.fileId, language: item.language } : { id: item.id };

export const toSaveProjectDto = (
   values: ProjectFormValues,
   { status }: { status?: SaveProjectDtoStatusEnumKey } = {},
): SaveProjectDto => ({
   slug: values.slug,
   thumbnailId: values.thumbnail?.id ?? null,
   showOnHomepage: values.showOnHomepage,
   ...toProjectMeta(values),
   translations: values.translations.map(toSaveTranslation),
   tagIds: values.tags.map((tag) => tag.id),
   links: toProjectLinks(values.links),
   media: values.media.map(toSaveMediaItem),
   ...(status && { status }),
});
