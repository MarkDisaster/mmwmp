import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProject } from '@/features/project/api/getProject';
import { getProjectLocales } from '@/features/project/api/getProjectLocales';

import { generateMetadata } from '../../../app/[locale]/projects/[slug]/page';

vi.mock('@/env', () => ({ env: {} }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: false }) }));
vi.mock('next/navigation', () => ({ notFound: vi.fn(), permanentRedirect: vi.fn() }));
vi.mock('next-intl/server', () => ({ getTranslations: vi.fn(), setRequestLocale: vi.fn() }));
vi.mock('@/features/project/api/getProject', () => ({ getProject: vi.fn() }));
vi.mock('@/features/project/api/getProjectLocales', () => ({ getProjectLocales: vi.fn() }));
vi.mock('@/features/project/api/getProjectRedirect', () => ({ getProjectRedirect: vi.fn() }));
vi.mock('@/features/contact/api/getContact', () => ({ getContact: vi.fn() }));
vi.mock('@/components/common/JsonLd', () => ({ JsonLd: () => null }));
vi.mock('@/features/contact/components/ContactSection', () => ({ ContactSection: () => null }));
vi.mock('@/features/project/components/ProjectDetailSection', () => ({
   ProjectDetailSection: () => null,
}));

const params = (slug: string) => ({ params: Promise.resolve({ slug, locale: 'en' as const }) });

describe('project detail generateMetadata', () => {
   beforeEach(() => {
      vi.mocked(getProject).mockReset();
      vi.mocked(getProjectLocales).mockReset().mockResolvedValue([]);
   });

   it('does not throw for an unknown slug', async () => {
      vi.mocked(getProject).mockResolvedValue(null);

      expect(await generateMetadata(params('old-slug'))).toEqual({ title: 'Project not found' });
   });

   it('lets an API failure propagate instead of caching a page titled not found', async () => {
      vi.mocked(getProject).mockRejectedValue(new Error('down'));

      await expect(generateMetadata(params('shop'))).rejects.toThrow('down');
   });

   it('logs a failed locale list and falls back to hreflang to the page itself', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(getProject).mockResolvedValue({
         slug: 'shop',
         title: 'Shop',
         translations: [{ language: 'en', title: 'Shop EN' }],
         tags: [],
         thumbnail: null,
      } as never);
      vi.mocked(getProjectLocales).mockRejectedValue(new Error('list down'));

      const metadata = await generateMetadata(params('shop'));

      expect(metadata.title).toBe('Shop EN');
      expect(Object.keys(metadata.alternates?.languages ?? {})).toEqual(['en', 'x-default']);
      expect(consoleError).toHaveBeenCalledWith(
         '[project metadata] Failed to load project locales:',
         expect.any(Error),
      );
      consoleError.mockRestore();
   });

   it('uses the alt text of the thumbnail for the og image, else the title', async () => {
      const project = (altText: string | null) => ({
         slug: 'shop',
         title: 'Shop',
         translations: [{ language: 'en', title: 'Shop EN' }],
         tags: [],
         thumbnail: {
            altText,
            variants: [{ variant: 'large', publicUrl: 'https://cdn.test/l.webp' }],
         },
      });

      vi.mocked(getProject).mockResolvedValueOnce(project(' Screenshot ') as never);
      const withAlt = await generateMetadata(params('shop'));
      vi.mocked(getProject).mockResolvedValueOnce(project('') as never);
      const without = await generateMetadata(params('shop'));

      expect((withAlt.openGraph?.images as { alt: string }[])[0]?.alt).toBe('Screenshot');
      expect((without.openGraph?.images as { alt: string }[])[0]?.alt).toBe('Shop EN');
   });
});
