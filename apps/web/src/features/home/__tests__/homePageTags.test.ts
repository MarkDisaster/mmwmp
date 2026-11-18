import type { ReactElement } from 'react';
import { Children, isValidElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AboutSection } from '@/features/about/components/AboutSection';
import { getTags } from '@/features/tag/api/getTags';

import HomePage from '../../../app/[locale]/page';
import { HOME_TAGS_LIMIT } from '../constants';

vi.mock('@/env', () => ({ env: {} }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock('next-intl/server', () => ({
   getTranslations: async () => (key: string) => key,
   setRequestLocale: vi.fn(),
}));
vi.mock('@/features/project/api/getProjects', () => ({ getHomepageProjects: async () => [] }));
vi.mock('@/features/service/api/getServices', () => ({ getServices: async () => ({ data: [] }) }));
vi.mock('@/features/contact/api/getContact', () => ({ getContact: async () => null }));
vi.mock('@/features/locale-content/api/getLocaleContent', () => ({ getPageLocalesSafe: vi.fn() }));
vi.mock('@/features/tag/api/getTags', () => ({ getTags: vi.fn() }));
vi.mock('@/features/about/utils/aboutContent', () => ({
   getAboutContent: () => ({ title: null, description: null }),
}));
vi.mock('@/components/common/JsonLd', () => ({ JsonLd: () => null }));
vi.mock('@/features/home/components/HeroSection', () => ({ HeroSection: () => null }));
vi.mock('@/features/about/components/AboutSection', () => ({ AboutSection: () => null }));
vi.mock('@/features/project/components/ProjectsSection', () => ({ ProjectsSection: () => null }));
vi.mock('@/features/contact/components/ContactSection', () => ({ ContactSection: () => null }));

function tagsOf(count: number) {
   return Array.from({ length: count }, (_, id) => ({ id }));
}

async function renderAboutProps() {
   const page = (await HomePage({ params: Promise.resolve({ locale: 'cs' }) })) as ReactElement<{
      children: ReactElement[];
   }>;
   const about = Children.toArray(page.props.children).find(
      (child): child is ReactElement<{ tags: { id: number }[]; variant: string }> =>
         isValidElement(child) && child.type === AboutSection,
   );
   return about?.props;
}

describe('homepage About preview tags', () => {
   beforeEach(() => {
      vi.mocked(getTags).mockReset();
   });

   it('shows only the first tags in the API order', async () => {
      vi.mocked(getTags).mockResolvedValue({ data: tagsOf(22) } as never);

      const props = await renderAboutProps();

      expect(props?.variant).toBe('preview');
      expect(props?.tags.map((tag) => tag.id)).toEqual(
         Array.from({ length: HOME_TAGS_LIMIT }, (_, id) => id),
      );
   });

   it('keeps all tags when there are fewer than the limit', async () => {
      vi.mocked(getTags).mockResolvedValue({ data: tagsOf(5) } as never);

      expect((await renderAboutProps())?.tags).toHaveLength(5);
   });

   it('shares the single getTags() call with /about (no limit argument)', async () => {
      vi.mocked(getTags).mockResolvedValue({ data: tagsOf(3) } as never);

      await renderAboutProps();

      expect(getTags).toHaveBeenCalledWith();
   });
});
