import { Injectable } from '@nestjs/common';

import { adminEntityPath } from '@/ai/admin-routes';
import { NOT_TRASHED } from '@/common/trash/trash';
import { PrismaService } from '@/prisma/prisma.service';

import { extractUrls } from './link-extractor';
import { type LinkProbe, probeLink } from './link-probe';
import { checkableUrl } from './url-guard';

export const LINK_CHECK_CONCURRENCY = 5;
export const LINK_CHECK_MAX_URLS = 40;
export const LINK_CHECK_DEFAULT_URLS = 20;
export const LINK_CHECK_DEADLINE_MS = 60_000;
const MAX_TEXT_ROWS = 2000;
const MAX_USED_IN = 3;

type LinkSourceKind = 'projectLink' | 'projectText' | 'serviceText';

export type LinkUsage = { kind: LinkSourceKind; id: number; name: string; adminUrl: string };

export type CollectedLinks = Map<string, LinkUsage[]>;

export type TruncatedSource = {
   source: 'projectLinks' | 'projectTexts' | 'serviceTexts';
   limit: number;
};

export type LinkCheckEntry = {
   url: string;
   usedIn: LinkUsage[];
} & (LinkProbe | { status: 'skipped'; redirects: 0; reason: string });

@Injectable()
export class LinkCheckService {
   constructor(private readonly prisma: PrismaService) {}

   async collect(parts: {
      projects: boolean;
      services: boolean;
   }): Promise<{ links: CollectedLinks; truncated: TruncatedSource[] }> {
      const links: CollectedLinks = new Map();
      const truncated: TruncatedSource[] = [];
      const cap = <T>(rows: T[], source: TruncatedSource['source']): T[] => {
         if (rows.length <= MAX_TEXT_ROWS) return rows;
         truncated.push({ source, limit: MAX_TEXT_ROWS });
         return rows.slice(0, MAX_TEXT_ROWS);
      };
      const add = (url: string, usage: LinkUsage) => {
         const usages = links.get(url) ?? [];
         if (!usages.some((u) => u.kind === usage.kind && u.id === usage.id)) usages.push(usage);
         links.set(url, usages);
      };

      if (parts.projects) {
         const projectLinks = await this.prisma.projectLink.findMany({
            where: { project: { ...NOT_TRASHED } },
            select: { url: true, project: { select: { id: true, title: true, slug: true } } },
            orderBy: [{ projectId: 'asc' }, { sortOrder: 'asc' }],
            take: MAX_TEXT_ROWS + 1,
         });
         for (const { url, project } of cap(projectLinks, 'projectLinks')) {
            add(url.trim(), {
               kind: 'projectLink',
               id: project.id,
               name: project.title.trim() || project.slug,
               adminUrl: adminEntityPath('project', project.id),
            });
         }

         const projectTexts = await this.prisma.projectTranslation.findMany({
            where: { project: { ...NOT_TRASHED } },
            select: {
               description: true,
               content: true,
               project: { select: { id: true, title: true, slug: true } },
            },
            orderBy: { id: 'asc' },
            take: MAX_TEXT_ROWS + 1,
         });
         for (const row of cap(projectTexts, 'projectTexts')) {
            for (const url of [...extractUrls(row.description), ...extractUrls(row.content)]) {
               add(url, {
                  kind: 'projectText',
                  id: row.project.id,
                  name: row.project.title.trim() || row.project.slug,
                  adminUrl: adminEntityPath('project', row.project.id),
               });
            }
         }
      }

      if (parts.services) {
         const serviceTexts = await this.prisma.serviceTranslation.findMany({
            where: { service: { ...NOT_TRASHED } },
            select: {
               description: true,
               content: true,
               service: { select: { id: true, title: true, slug: true } },
            },
            orderBy: { id: 'asc' },
            take: MAX_TEXT_ROWS + 1,
         });
         for (const row of cap(serviceTexts, 'serviceTexts')) {
            for (const url of [...extractUrls(row.description), ...extractUrls(row.content)]) {
               add(url, {
                  kind: 'serviceText',
                  id: row.service.id,
                  name: row.service.title.trim() || row.service.slug,
                  adminUrl: adminEntityPath('service', row.service.id),
               });
            }
         }
      }
      return { links, truncated };
   }

   async check(
      urls: { url: string; usedIn: LinkUsage[] }[],
      probe: (url: URL) => Promise<LinkProbe> = probeLink,
      now: () => number = Date.now,
   ): Promise<LinkCheckEntry[]> {
      const deadline = now() + LINK_CHECK_DEADLINE_MS;
      const results = new Array<LinkCheckEntry>(urls.length);
      let next = 0;

      const worker = async () => {
         while (next < urls.length) {
            const index = next++;
            const { url, usedIn } = urls[index];
            if (now() > deadline) {
               results[index] = {
                  url,
                  usedIn: usedIn.slice(0, MAX_USED_IN),
                  status: 'skipped',
                  redirects: 0,
                  reason: 'Not checked in time, check again',
               };
               continue;
            }
            const allowed = checkableUrl(url);
            const outcome: LinkProbe = allowed.ok
               ? await probe(allowed.url)
               : { status: 'blocked', redirects: 0, reason: allowed.reason };
            results[index] = { url, usedIn: usedIn.slice(0, MAX_USED_IN), ...outcome };
         }
      };

      await Promise.all(Array.from({ length: LINK_CHECK_CONCURRENCY }, worker));
      return results;
   }
}
