import { describe, expect, it, vi } from 'vitest';

import { buildProjectsMetadata } from '../utils/projectsMetadata';

vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_SITE_URL: 'https://marek.media' } }));
vi.mock('next-intl/server', () => ({
   getTranslations: async () => (key: string) => `Projects.${key}`,
}));

describe('buildProjectsMetadata', () => {
   it('uses /projects and the plain title for page 1', async () => {
      const metadata = await buildProjectsMetadata('cs', 1);

      expect(metadata.title).toBe('Projects.title');
      expect(metadata.description).toBe('Projects.description');
      expect(metadata.alternates?.canonical).toBe('https://marek.media/cs/projects');
   });

   it('puts the page in the path and the title from page 2', async () => {
      const metadata = await buildProjectsMetadata('en', 3);

      expect(metadata.title).toBe('Projects.title (3)');
      expect(metadata.alternates?.canonical).toBe('https://marek.media/en/projects/page/3');
      expect(metadata.openGraph?.url).toBe('https://marek.media/en/projects/page/3');
   });

   it('lists the page under every locale as hreflang', async () => {
      const metadata = await buildProjectsMetadata('cs', 2);

      expect(metadata.alternates?.languages).toMatchObject({
         cs: 'https://marek.media/cs/projects/page/2',
         en: 'https://marek.media/en/projects/page/2',
      });
   });

   it('keeps a single page indexable', async () => {
      expect((await buildProjectsMetadata('cs', 2)).robots).toBeUndefined();
   });

   it('marks a range noindex, follow with its own address as canonical', async () => {
      const metadata = await buildProjectsMetadata('cs', 1, undefined, 2);

      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(metadata.title).toBe('Projects.title (1-2)');
      expect(metadata.alternates?.canonical).toBe('https://marek.media/cs/projects/page/1-2');
      expect(metadata.alternates?.languages).toBeUndefined();
   });
});
