import type { SortingState, Updater } from '@tanstack/react-table';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

import { ServiceTable } from '../components/ServiceTable';
import { SERVICE_SORT_FIELDS } from '../constants';

const sortableColumnIds = async () => {
   const onSortingChange = vi.fn<(updater: Updater<SortingState>) => void>();
   render(
      <ServiceTable
         data={[]}
         totalCount={0}
         pagination={{ pageIndex: 0, pageSize: 10 }}
         onPaginationChange={vi.fn()}
         sorting={[]}
         onSortingChange={onSortingChange}
         onEdit={vi.fn()}
         emptyState={null}
      />,
      { wrapper: TooltipProvider },
   );

   const user = userEvent.setup();
   for (const header of screen.getAllByRole('columnheader')) {
      const button = within(header).queryByRole('button');
      if (button) await user.click(button);
   }
   return onSortingChange.mock.calls.map(([updater]) => {
      const sorting = typeof updater === 'function' ? updater([]) : updater;
      return sorting[0]?.id;
   });
};

describe('ServiceTable', () => {
   it('should offer sorting by exactly the columns the route accepts', async () => {
      expect((await sortableColumnIds()).sort()).toEqual([...SERVICE_SORT_FIELDS].sort());
   });

   it('should not offer sorting by the slug, which the API does not sort by', async () => {
      expect(await sortableColumnIds()).not.toContain('slug');
   });
});
