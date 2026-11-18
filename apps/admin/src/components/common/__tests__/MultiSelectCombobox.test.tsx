import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';

import { MultiSelectCombobox } from '../MultiSelectCombobox';

const noop = () => {};

const NO_RESULTS = 'No results';

const OPTIONS = [
   { id: 1, label: 'React' },
   { id: 2, label: 'Vue' },
];

const renderMenu = (props: Partial<ComponentProps<typeof MultiSelectCombobox>> = {}) =>
   render(
      <MultiSelectCombobox
         label="Tags"
         addLabel="Add tags"
         searchPlaceholder="Search tags"
         removeLabel="Remove"
         selected={[]}
         onChange={noop}
         options={OPTIONS}
         open
         onOpenChange={noop}
         {...props}
      />,
   );

describe('MultiSelectCombobox', () => {
   it('should say the options are loading instead of that there are none', () => {
      renderMenu({ options: [], loading: true });

      expect(screen.getByRole('progressbar', { name: 'Loading...' })).toBeInTheDocument();
      expect(screen.queryByText(NO_RESULTS)).not.toBeInTheDocument();
   });

   it('should say loading the options failed instead of that there are none', () => {
      renderMenu({ options: [], error: true });

      expect(screen.getByText('Could not load the data')).toBeInTheDocument();
      expect(screen.queryByText(NO_RESULTS)).not.toBeInTheDocument();
   });

   it('should say there are no options once they loaded empty', () => {
      renderMenu({ options: [] });

      expect(screen.getByText(NO_RESULTS)).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
   });

   it('should say the options are the first page of more records', () => {
      renderMenu({ totalCount: 150 });

      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
         'React',
         'Vue',
      ]);
      expect(
         screen.getByText('Showing the first 2 of 150; the search covers these only.'),
      ).toBeInTheDocument();
   });

   it('should not say anything about truncation when every record is an option', () => {
      renderMenu({ totalCount: 2 });

      expect(screen.queryByText(/Showing the first/)).not.toBeInTheDocument();
   });
});
