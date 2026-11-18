import type { TFunction } from 'i18next';

import { formatToolInput } from '@/features/ai-chat/utils/formatToolInput';
import type {
   BulkChange,
   BulkHeader,
   BulkLine,
   BulkSummary,
} from '@/features/ai-chat/utils/summarizeFileRenames';
import type { TagSummaryLine } from '@/features/ai-chat/utils/summarizeTagInput';
import type { UserSummaryLine } from '@/features/ai-chat/utils/summarizeUserInput';
import { formatFileSize } from '@/utils/file';

const EMPTY_VALUE = '∅';

export const describeToolInput = (input: unknown, lines?: string[] | null): string | null => {
   if (input == null) return null;
   if (lines) return lines.join('; ');
   return formatToolInput(input);
};

export const describeTagLine = (line: TagSummaryLine, t: TFunction): string =>
   t(line.key, {
      ...line.params,
      ...(typeof line.params.language === 'string'
         ? { language: t(`common.language.${line.params.language}`) }
         : {}),
   });

export const describeUserLine = (line: UserSummaryLine, t: TFunction): string =>
   t(line.key, line.params);

const describeBulkChange = (change: BulkChange, t: TFunction, locale: string): string => {
   switch (change.key) {
      case 'chat.approval.fileRename':
         return t(change.key, { ...change.params, value: change.params.value ?? EMPTY_VALUE });
      case 'chat.approval.fileLanguage': {
         const { language } = change.params;
         return t(change.key, {
            ...change.params,
            language:
               language === null
                  ? EMPTY_VALUE
                  : t(`common.language.${language}`, { defaultValue: language }),
         });
      }
      case 'chat.approval.fileAlt':
         return t(change.key, {
            ...change.params,
            alt: change.params.alt === null ? EMPTY_VALUE : `"${change.params.alt}"`,
         });
      case 'chat.approval.fileDelete':
         return t(change.key, {
            name: change.params.name,
            size: formatFileSize(change.params.sizeBytes, locale),
         });
      case 'chat.approval.projectTitle':
         return t(change.key, change.params);
   }
};

export const describeBulkLine = (line: BulkLine, t: TFunction, locale: string): string =>
   line.map((change) => describeBulkChange(change, t, locale)).join('; ');

export const describeBulkHeader = (header: BulkHeader, t: TFunction, locale: string): string => {
   switch (header.key) {
      case 'chat.approval.targetStatus':
         return t(header.key, { status: t(`chat.approval.status.${header.params.status}`) });
      case 'chat.approval.tagLabel':
         return t(header.key, header.params);
      case 'chat.approval.totalSize':
         return t(header.key, { size: formatFileSize(header.params.sizeBytes, locale) });
   }
};

export const describeBulkSummary = (summary: BulkSummary, t: TFunction, locale: string): string =>
   summary.lines.map((line) => describeBulkLine(line, t, locale)).join('; ') +
   (summary.more > 0 ? ` (+${summary.more})` : '');
