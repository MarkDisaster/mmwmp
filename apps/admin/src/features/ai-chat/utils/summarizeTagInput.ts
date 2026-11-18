import { isRecord } from '@/features/ai-chat/utils/isRecord';

export type TagSummaryLine = {
   key:
      | 'chat.approval.tagTarget'
      | 'chat.approval.tagLabel'
      | 'chat.approval.tagSlug'
      | 'chat.approval.tagName'
      | 'chat.approval.tagNameRemoved'
      | 'chat.approval.tagColor';
   params: Record<string, string | number>;
};

const isLanguage = (value: unknown): value is string => value === 'cs' || value === 'en';

const nameLines = (translations: unknown): TagSummaryLine[] =>
   (Array.isArray(translations) ? translations : []).flatMap((entry): TagSummaryLine[] =>
      isRecord(entry) && isLanguage(entry.language) && typeof entry.name === 'string'
         ? [
              {
                 key: 'chat.approval.tagName',
                 params: { language: entry.language, name: entry.name },
              },
           ]
         : [],
   );

const removedLines = (languages: unknown): TagSummaryLine[] =>
   (Array.isArray(languages) ? languages : []).flatMap((language): TagSummaryLine[] =>
      isLanguage(language) ? [{ key: 'chat.approval.tagNameRemoved', params: { language } }] : [],
   );

const textLine = (
   key: 'chat.approval.tagSlug' | 'chat.approval.tagColor',
   param: 'slug' | 'color',
   value: unknown,
): TagSummaryLine[] =>
   typeof value === 'string' && value !== '' ? [{ key, params: { [param]: value } }] : [];

const TAG_TOOLS = new Set(['createTag', 'updateTag', 'deleteTag']);

const targetLine = (input: Record<string, unknown>): TagSummaryLine[] => {
   if (typeof input.id !== 'number') return [];
   return typeof input.currentName === 'string' && input.currentName !== ''
      ? [{ key: 'chat.approval.tagLabel', params: { name: input.currentName, id: input.id } }]
      : [{ key: 'chat.approval.tagTarget', params: { id: input.id } }];
};

export const summarizeTagInput = (toolName: string, input: unknown): TagSummaryLine[] | null => {
   if (!TAG_TOOLS.has(toolName) || !isRecord(input)) return null;

   const lines: TagSummaryLine[] = [
      ...(toolName !== 'createTag' ? targetLine(input) : []),
      ...textLine('chat.approval.tagSlug', 'slug', input.slug),
      ...nameLines(input.translations),
      ...removedLines(input.removeLanguages),
      ...textLine('chat.approval.tagColor', 'color', input.color),
   ];

   return lines.length > 0 ? lines : null;
};
