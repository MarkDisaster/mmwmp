import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectEntity } from '@/api/generated';
import { getPublishedRowLock } from '@/utils/reorder';

import { ProjectCardGrid } from '../components/ProjectCardGrid';

vi.mock('../components/ProjectCard', () => ({
   ProjectCard: ({ project }: { project: ProjectEntity }) => <div>Project {project.id}</div>,
}));

const HANDLE = 'Drag to reorder';
const ARIA_DISABLED = 'aria-disabled';
const PROJECTS = [
   { id: 1, status: 'draft' },
   { id: 2, status: 'published' },
] as ProjectEntity[];

describe('ProjectCardGrid', () => {
   it('should show no handles for a role that may not reorder', () => {
      render(<ProjectCardGrid projects={PROJECTS} />);
      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: HANDLE })).not.toBeInTheDocument();
   });

   it('should lock published cards for a role without the publish permission', () => {
      render(
         <ProjectCardGrid
            projects={PROJECTS}
            reorder={{ onReorder: vi.fn(), isRowDisabled: getPublishedRowLock(PROJECTS, false) }}
         />,
      );
      const [draft, published] = screen.getAllByRole('button', { name: HANDLE });
      expect(draft).toHaveAttribute(ARIA_DISABLED, 'false');
      expect(published).toHaveAttribute(ARIA_DISABLED, 'true');
   });

   it('should keep every handle inert while the view cannot be saved', () => {
      render(
         <ProjectCardGrid projects={PROJECTS} reorder={{ onReorder: vi.fn(), disabled: true }} />,
      );
      screen
         .getAllByRole('button', { name: HANDLE })
         .forEach((handle) => expect(handle).toHaveAttribute(ARIA_DISABLED, 'true'));
   });
});
