import { isRecord } from '@/features/ai-chat/utils/isRecord';

export const PREVIEW_PAIRS = 8;

type Item = Record<string, unknown>;

export type BulkHeader =
   | { key: 'chat.approval.targetStatus'; params: { status: string } }
   | { key: 'chat.approval.tagLabel'; params: { name: string; id: number } }
   | { key: 'chat.approval.totalSize'; params: { sizeBytes: number } };

export type BulkChange =
   | { key: 'chat.approval.fileRename'; params: { name: string; value: string | null } }
   | { key: 'chat.approval.fileLanguage'; params: { name: string; language: string | null } }
   | { key: 'chat.approval.fileAlt'; params: { name: string; alt: string | null } }
   | { key: 'chat.approval.fileDelete'; params: { name: string; sizeBytes: number } }
   | { key: 'chat.approval.projectTitle'; params: { title: string } };

export type BulkLine = BulkChange[];

export type BulkSummary = {
   count: number;
   header: BulkHeader | null;
   lines: BulkLine[];
   more: number;
};

const altOf = (alt: unknown): string | null =>
   typeof alt !== 'string' || alt.trim() === '' ? null : alt.trim();

const textOrNull = (value: unknown): string | null => (value === null ? null : String(value));

const fileChanges = (item: Item, name: string): BulkChange[] => {
   const changes: BulkChange[] = [];
   if (item.displayName !== undefined) {
      changes.push({
         key: 'chat.approval.fileRename',
         params: { name, value: textOrNull(item.displayName) },
      });
   }
   if (item.language !== undefined) {
      changes.push({
         key: 'chat.approval.fileLanguage',
         params: { name, language: textOrNull(item.language) },
      });
   }
   if (item.altText !== undefined) {
      changes.push({ key: 'chat.approval.fileAlt', params: { name, alt: altOf(item.altText) } });
   }
   return changes;
};

const lineOf = (item: Item): BulkLine | null => {
   if (typeof item.currentName === 'string') {
      const changes = fileChanges(item, item.currentName);
      return changes.length > 0 ? changes : null;
   }
   if (typeof item.name === 'string' && typeof item.sizeBytes === 'number') {
      return [
         {
            key: 'chat.approval.fileDelete',
            params: { name: item.name, sizeBytes: item.sizeBytes },
         },
      ];
   }
   if (typeof item.title === 'string') {
      return [{ key: 'chat.approval.projectTitle', params: { title: item.title } }];
   }
   return null;
};

const headerOf = (
   input: { status?: unknown; tagId?: unknown; tagName?: unknown },
   list: Item[],
): BulkHeader | null => {
   if (typeof input.status === 'string') {
      return { key: 'chat.approval.targetStatus', params: { status: input.status } };
   }
   if (typeof input.tagId === 'number' && typeof input.tagName === 'string') {
      return { key: 'chat.approval.tagLabel', params: { name: input.tagName, id: input.tagId } };
   }
   if (list.every((item) => typeof item.sizeBytes === 'number')) {
      const total = list.reduce((sum, item) => sum + (item.sizeBytes as number), 0);
      return { key: 'chat.approval.totalSize', params: { sizeBytes: total } };
   }
   return null;
};

export const summarizeFileRenames = (
   input: unknown,
   { expandAll = false }: { expandAll?: boolean } = {},
): BulkSummary | null => {
   const record = input as {
      files?: unknown;
      projects?: unknown;
      status?: unknown;
      tagId?: unknown;
      tagName?: unknown;
   } | null;
   const list = record?.files ?? record?.projects;
   if (!record || !Array.isArray(list) || list.length === 0 || !list.every(isRecord)) return null;

   const lines = list.map(lineOf);
   if (lines.some((line) => line === null)) return null;

   const preview = expandAll
      ? (lines as BulkLine[])
      : (lines as BulkLine[]).slice(0, PREVIEW_PAIRS);
   return {
      count: list.length,
      header: headerOf(record, list),
      lines: preview,
      more: Math.max(0, list.length - preview.length),
   };
};
