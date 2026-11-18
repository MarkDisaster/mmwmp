import { type AdminLinkTarget, resolveAdminHref } from '@/features/ai-chat/utils/adminNavigation';
import { isRecord } from '@/features/ai-chat/utils/isRecord';

export const MAX_TOOL_ENTITY_LINKS = 10;

export type ToolEntityLink = { label: string; href: string; target: AdminLinkTarget };

const labelOf = (record: Record<string, unknown>): string | null => {
   for (const key of ['title', 'name', 'email', 'slug'] as const) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
   }
   return typeof record.id === 'number' ? `#${record.id}` : null;
};

const linkOf = (value: unknown, origin: string): ToolEntityLink | null => {
   if (!isRecord(value) || typeof value.adminUrl !== 'string') return null;
   const target = resolveAdminHref(value.adminUrl, origin);
   const label = labelOf(value);
   return target && label ? { label, href: value.adminUrl, target } : null;
};

export const extractToolEntityLinks = (output: unknown, origin: string): ToolEntityLink[] => {
   if (!isRecord(output)) return [];
   const nested = ['items', 'projects'].flatMap((key) => {
      const list = output[key];
      return Array.isArray(list) ? list : [];
   });
   const seen = new Set<string>();
   const links: ToolEntityLink[] = [];
   for (const value of [output, ...nested]) {
      const link = linkOf(value, origin);
      if (!link || seen.has(link.href)) continue;
      seen.add(link.href);
      links.push(link);
      if (links.length === MAX_TOOL_ENTITY_LINKS) break;
   }
   return links;
};
