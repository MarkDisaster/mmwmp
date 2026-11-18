import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProjects } from '@/features/project/api/getProjects';
import { ProjectsPageContent } from '@/features/project/components/ProjectsPageContent';
import { PROJECTS_PAGE_LIMIT } from '@/features/project/constants';
import type { ProjectCardData } from '@/features/project/utils/projectCard';

vi.mock('@/features/project/api/getProjects', () => ({ getProjects: vi.fn() }));
vi.mock('@/features/contact/api/getContact', () => ({ getContact: async () => null }));
vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
vi.mock('next/navigation', () => ({
   notFound: () => {
      throw new Error('NEXT_NOT_FOUND');
   },
}));
vi.mock('@/features/project/components/ProjectsView', () => ({
   ProjectsView: function ProjectsView() {
      return null;
   },
}));
vi.mock('@/components/common/JsonLd', () => ({ JsonLd: () => null }));
vi.mock('@/components/common/SectionHeader', () => ({ SectionHeader: () => null }));
vi.mock('@/features/contact/components/ContactSection', () => ({ ContactSection: () => null }));
vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_SITE_URL: 'https://marek.media' } }));

const getProjectsMock = vi.mocked(getProjects);

const card = (id: number): ProjectCardData => ({
   id,
   slug: `p-${id}`,
   title: `Project ${id}`,
   thumbnail: null,
   years: null,
   tags: [],
});

const TOTAL = PROJECTS_PAGE_LIMIT * 3;
const pageCards = (page: number) =>
   page > 3
      ? []
      : Array.from({ length: PROJECTS_PAGE_LIMIT }, (_, i) =>
           card((page - 1) * PROJECTS_PAGE_LIMIT + i + 1),
        );

type ElementLike = { type: unknown; props: Record<string, unknown> };

const findView = (node: unknown): ElementLike | null => {
   if (!node || typeof node !== 'object') return null;
   const element = node as ElementLike;
   if ((element.type as { name?: string })?.name === 'ProjectsView') return element;
   const children = element.props?.children;
   for (const child of Array.isArray(children) ? children : [children]) {
      const found = findView(child);
      if (found) return found;
   }
   return null;
};

const render = async (page: number, lastPage?: number): Promise<ElementLike> => {
   const view = findView(await ProjectsPageContent({ locale: 'cs', page, lastPage }));
   if (!view) throw new Error('ProjectsView not rendered');
   return view;
};

beforeEach(() => {
   getProjectsMock.mockReset();
   getProjectsMock.mockImplementation(async (_locale, page) => ({
      projects: pageCards(page),
      totalCount: TOTAL,
   }));
});

describe('ProjectsPageContent', () => {
   it('renders a single page as before', async () => {
      const view = await render(2);

      expect(getProjectsMock).toHaveBeenCalledTimes(1);
      expect(view.props).toMatchObject({ firstPage: 2, initialPage: 2, totalCount: TOTAL });
      expect(view.props.initialProjects).toEqual(pageCards(2));
   });

   it('concatenates the pages of a range in order', async () => {
      const view = await render(1, 3);

      expect(view.props.initialProjects).toEqual([
         ...pageCards(1),
         ...pageCards(2),
         ...pageCards(3),
      ]);
      expect(view.props).toMatchObject({ firstPage: 1, initialPage: 3, totalCount: TOTAL });
   });

   it('keys the view by the first page only', async () => {
      const element = findView(await ProjectsPageContent({ locale: 'cs', page: 1, lastPage: 3 }));
      expect((element as unknown as { key: string }).key).toBe('1');
   });

   it('fetches the last page first, so a range beyond the list costs one request', async () => {
      await expect(render(1, 1000)).rejects.toThrow('NEXT_NOT_FOUND');

      expect(getProjectsMock).toHaveBeenCalledTimes(1);
      expect(getProjectsMock).toHaveBeenCalledWith('cs', 1000);
   });

   it('does not show a project twice when one moved across a page boundary', async () => {
      getProjectsMock.mockImplementation(async (_locale, page) => ({
         projects: page === 1 ? [card(1), card(2)] : [card(2), card(3)],
         totalCount: 3,
      }));

      expect((await render(1, 2)).props.initialProjects).toEqual([card(1), card(2), card(3)]);
   });

   it('answers 404 for an empty page after the first, not for an empty first page', async () => {
      getProjectsMock.mockResolvedValue({ projects: [], totalCount: 0 });

      await expect(render(2)).rejects.toThrow('NEXT_NOT_FOUND');
      expect((await render(1)).props.initialProjects).toEqual([]);
   });
});
