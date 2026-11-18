import type { PrismaService } from '@/prisma/prisma.service';

import {
   LINK_CHECK_CONCURRENCY,
   LINK_CHECK_DEADLINE_MS,
   LinkCheckService,
   type LinkUsage,
} from '../link-check.service';
import type { LinkProbe } from '../link-probe';

const usage = (id = 1): LinkUsage => ({
   kind: 'projectLink',
   id,
   name: 'P',
   adminUrl: `/projects/${id}`,
});

describe('LinkCheckService.collect', () => {
   let prisma: Record<
      'projectLink' | 'projectTranslation' | 'serviceTranslation',
      { findMany: jest.Mock }
   >;
   let service: LinkCheckService;

   beforeEach(() => {
      prisma = {
         projectLink: {
            findMany: jest.fn().mockResolvedValue([
               { url: ' https://a.example.com/ ', project: { id: 1, title: 'Alfa', slug: 'alfa' } },
               { url: 'https://shared.example.com/', project: { id: 2, title: '', slug: 'beta' } },
            ]),
         },
         projectTranslation: {
            findMany: jest.fn().mockResolvedValue([
               {
                  description: 'viz https://shared.example.com/',
                  content: '<a href="https://c.example.com/">c</a>',
                  project: { id: 1, title: 'Alfa', slug: 'alfa' },
               },
            ]),
         },
         serviceTranslation: {
            findMany: jest.fn().mockResolvedValue([
               {
                  description: null,
                  content: '[s](https://s.example.com/)',
                  service: { id: 9, title: 'Web', slug: 'web' },
               },
            ]),
         },
      };
      service = new LinkCheckService(prisma as unknown as PrismaService);
   });

   it('gathers every URL with the records that use it, the same URL once', async () => {
      const { links, truncated } = await service.collect({ projects: true, services: true });
      expect(truncated).toEqual([]);

      expect([...links.keys()].sort()).toEqual([
         'https://a.example.com/',
         'https://c.example.com/',
         'https://s.example.com/',
         'https://shared.example.com/',
      ]);
      expect(links.get('https://shared.example.com/')).toEqual([
         { kind: 'projectLink', id: 2, name: 'beta', adminUrl: '/projects/2' },
         { kind: 'projectText', id: 1, name: 'Alfa', adminUrl: '/projects/1' },
      ]);
      expect(links.get('https://s.example.com/')).toEqual([
         { kind: 'serviceText', id: 9, name: 'Web', adminUrl: '/services/9' },
      ]);
   });

   it('says when a source has more rows than were read, and keeps the rows within the limit', async () => {
      const row = (i: number) => ({
         url: `https://h${i}.example.com/`,
         project: { id: i, title: 'P', slug: 'p' },
      });
      prisma.projectLink.findMany.mockResolvedValue(Array.from({ length: 2001 }, (_, i) => row(i)));

      const { links, truncated } = await service.collect({ projects: true, services: false });

      expect(truncated).toEqual([{ source: 'projectLinks', limit: 2000 }]);
      expect(links.has('https://h1999.example.com/')).toBe(true);
      expect(links.has('https://h2000.example.com/')).toBe(false);
      expect(prisma.projectLink.findMany.mock.calls[0][0].take).toBe(2001);
   });

   it('reads only the allowed parts and never a trashed record', async () => {
      await service.collect({ projects: false, services: true });

      expect(prisma.projectLink.findMany).not.toHaveBeenCalled();
      expect(prisma.projectTranslation.findMany).not.toHaveBeenCalled();
      expect(prisma.serviceTranslation.findMany.mock.calls[0][0].where).toEqual({
         service: { deletedAt: null },
      });

      await service.collect({ projects: true, services: false });
      expect(prisma.projectLink.findMany.mock.calls[0][0].where).toEqual({
         project: { deletedAt: null },
      });
      expect(prisma.projectTranslation.findMany.mock.calls[0][0].where).toEqual({
         project: { deletedAt: null },
      });
   });
});

describe('LinkCheckService.check', () => {
   const service = new LinkCheckService({} as PrismaService);
   const ok: LinkProbe = { status: 'ok', httpStatus: 200, redirects: 0 };

   it('checks each URL, keeps the order and never requests a URL the guard refuses', async () => {
      const probe = jest.fn((target: URL) => Promise.resolve({ ...ok, finalUrl: target.href }));

      const results = await service.check(
         [
            { url: 'https://a.example.com/', usedIn: [usage(1)] },
            { url: 'http://169.254.169.254/latest', usedIn: [usage(2)] },
            { url: 'http://localhost:8080/', usedIn: [usage(3)] },
            { url: 'https://b.example.com/', usedIn: [usage(4)] },
         ],
         probe,
      );

      expect(results.map((r) => [r.url, r.status])).toEqual([
         ['https://a.example.com/', 'ok'],
         ['http://169.254.169.254/latest', 'blocked'],
         ['http://localhost:8080/', 'blocked'],
         ['https://b.example.com/', 'ok'],
      ]);
      expect(probe.mock.calls.map(([target]) => target.href)).toEqual([
         'https://a.example.com/',
         'https://b.example.com/',
      ]);
   });

   it('runs at most the concurrency cap at once', async () => {
      let running = 0;
      let peak = 0;
      const probe = async () => {
         running += 1;
         peak = Math.max(peak, running);
         await new Promise((resolve) => setTimeout(resolve, 5));
         running -= 1;
         return ok;
      };
      const urls = Array.from({ length: 30 }, (_, i) => ({
         url: `https://h${i}.example.com/`,
         usedIn: [],
      }));

      const results = await service.check(urls, probe);

      expect(results).toHaveLength(30);
      expect(peak).toBe(LINK_CHECK_CONCURRENCY);
   });

   it('stops starting requests after the deadline and says which URLs were skipped', async () => {
      let clock = 0;
      const probe = jest.fn(() => {
         clock += LINK_CHECK_DEADLINE_MS / 2;
         return Promise.resolve(ok);
      });
      const urls = Array.from({ length: 12 }, (_, i) => ({
         url: `https://h${i}.example.com/`,
         usedIn: [],
      }));

      const results = await service.check(urls, probe, () => clock);

      const skipped = results.filter((r) => r.status === 'skipped');
      expect(skipped.length).toBeGreaterThan(0);
      expect(skipped.length + probe.mock.calls.length).toBe(12);
   });

   it('names at most three places where a URL is used', async () => {
      const [result] = await service.check(
         [{ url: 'https://a.example.com/', usedIn: [1, 2, 3, 4, 5].map(usage) }],
         () => Promise.resolve(ok),
      );

      expect(result.usedIn).toHaveLength(3);
   });
});
