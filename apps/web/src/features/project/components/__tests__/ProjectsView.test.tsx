// @vitest-environment happy-dom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectsView } from '@/features/project/components/ProjectsView';
import { PROJECTS_PAGE_LIMIT } from '@/features/project/constants';
import type { ProjectCardData } from '@/features/project/utils/projectCard';

vi.mock('next-intl', () => ({
   useLocale: () => 'cs',
   useTranslations: () => (key: string) => key,
}));
let onReplace: (href: string) => void = () => undefined;
const replace = vi.fn((href: string) => onReplace(href));
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/components/common/Pagination', () => ({
   Pagination: ({ currentPage }: { currentPage: number }) => (
      <nav data-testid="pagination" data-current={currentPage} />
   ),
}));
vi.mock('../ProjectList', () => ({
   ProjectList: ({ projects, offset }: { projects: ProjectCardData[]; offset?: number }) => (
      <ul data-offset={offset}>
         {projects.map((project) => (
            <li key={project.id}>{project.title}</li>
         ))}
      </ul>
   ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const card = (id: number): ProjectCardData => ({
   id,
   slug: `p-${id}`,
   title: `Project ${id}`,
   thumbnail: null,
   years: null,
   tags: [],
});

const pageOf = (page: number) =>
   Array.from({ length: PROJECTS_PAGE_LIMIT }, (_, i) =>
      card((page - 1) * PROJECTS_PAGE_LIMIT + i + 1),
   );

const RANGE_1_3 = '/projects/page/1-3';
const TOTAL = PROJECTS_PAGE_LIMIT * 3;

let container: HTMLDivElement;
let root: Root;

const render = async (props: Partial<Parameters<typeof ProjectsView>[0]> = {}) => {
   await act(async () => {
      root.render(
         <ProjectsView
            initialProjects={pageOf(1)}
            totalCount={TOTAL}
            initialPage={1}
            basePath="/projects"
            {...props}
         />,
      );
   });
};

const button = () => container.querySelector('button');
const titles = () => [...container.querySelectorAll('li')].map((li) => li.textContent);

const clickLoadMore = async () => {
   await act(async () => {
      button()?.click();
   });
};

const mockPages = () =>
   vi.fn(async (url: string) => {
      const page = Number(new URL(url, 'http://x').searchParams.get('page'));
      return Response.json({ projects: pageOf(page), totalCount: TOTAL });
   });

beforeEach(() => {
   container = document.createElement('div');
   document.body.append(container);
   root = createRoot(container);
});

afterEach(async () => {
   await act(async () => root.unmount());
   container.remove();
   replace.mockClear();
   vi.unstubAllGlobals();
});

describe('ProjectsView URL state', () => {
   it('navigates the router to the loaded range', async () => {
      vi.stubGlobal('fetch', mockPages());
      await render();

      await clickLoadMore();
      expect(replace).toHaveBeenLastCalledWith('/projects/page/1-2', { scroll: false });
      expect(titles()).toHaveLength(PROJECTS_PAGE_LIMIT * 2);

      await clickLoadMore();
      expect(replace).toHaveBeenLastCalledWith(RANGE_1_3, { scroll: false });
   });

   it('hides the button once the last page is loaded', async () => {
      vi.stubGlobal('fetch', mockPages());
      await render({ initialProjects: [...pageOf(1), ...pageOf(2)], initialPage: 2, firstPage: 1 });

      await clickLoadMore();

      expect(button()).toBeNull();
      expect(replace).toHaveBeenLastCalledWith(RANGE_1_3, { scroll: false });
   });

   it('renders a range from the props and continues after its last page', async () => {
      const fetchMock = mockPages();
      vi.stubGlobal('fetch', fetchMock);
      await render({ initialProjects: [...pageOf(1), ...pageOf(2)], initialPage: 2, firstPage: 1 });

      expect(titles()).toHaveLength(PROJECTS_PAGE_LIMIT * 2);
      expect(
         container.querySelector('[data-testid=pagination]')?.getAttribute('data-current'),
      ).toBe('2');

      await clickLoadMore();

      expect(String(fetchMock.mock.calls[0]?.[0])).toContain('page=3');
   });

   it('starts a range that does not begin at page 1 from its first page', async () => {
      vi.stubGlobal('fetch', mockPages());
      await render({ initialProjects: pageOf(2), initialPage: 2, firstPage: 2 });

      expect(container.querySelector('ul')?.getAttribute('data-offset')).toBe(
         String(PROJECTS_PAGE_LIMIT),
      );
      await clickLoadMore();

      expect(replace).toHaveBeenLastCalledWith('/projects/page/2-3', { scroll: false });
   });

   it('leaves the address alone when the request fails', async () => {
      vi.stubGlobal(
         'fetch',
         vi.fn(async () => new Response('', { status: 500 })),
      );
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await render();

      await clickLoadMore();

      expect(replace).not.toHaveBeenCalled();
      expect(container.querySelector('[role=alert]')).not.toBeNull();
   });

   it('follows 1 -> 1-2 -> 1-3 with the route answering each router navigation', async () => {
      const Route = () => {
         const [last, setLast] = useState(1);
         onReplace = (href) => setLast(Number(/-(\d+)$/.exec(href)?.[1]));
         const pages = Array.from({ length: last }, (_, i) => pageOf(i + 1)).flat();
         return (
            <ProjectsView
               key={1}
               initialProjects={pages}
               totalCount={TOTAL}
               firstPage={1}
               initialPage={last}
               basePath="/projects"
            />
         );
      };
      vi.stubGlobal('fetch', mockPages());
      await act(async () => root.render(<Route />));

      await clickLoadMore();
      expect(replace).toHaveBeenLastCalledWith('/projects/page/1-2', { scroll: false });
      expect(titles()).toHaveLength(PROJECTS_PAGE_LIMIT * 2);
      expect(button()).not.toBeNull();

      await clickLoadMore();
      expect(replace).toHaveBeenLastCalledWith(RANGE_1_3, { scroll: false });
      expect(titles()).toEqual(
         pageOf(1)
            .concat(pageOf(2), pageOf(3))
            .map((c) => c.title),
      );
      expect(button()).toBeNull();
   });
});
