import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';

import { type ComboboxOption, MultiSelectCombobox } from '@/components/common/MultiSelectCombobox';

const OPTIONS: ComboboxOption[] = [
   { id: 1, label: 'React' },
   { id: 2, label: 'TypeScript' },
   { id: 3, label: 'NestJS' },
   { id: 4, label: 'PostgreSQL' },
   { id: 5, label: 'Design systems' },
];

const meta: Meta<typeof MultiSelectCombobox> = {
   title: 'Common/MultiSelectCombobox',
   component: MultiSelectCombobox,
   tags: ['autodocs'],
   decorators: [
      (Story) => (
         <div className="w-96">
            <Story />
         </div>
      ),
   ],
   args: {
      label: 'Tags',
      addLabel: 'Add tag',
      searchPlaceholder: 'Search tags...',
      removeLabel: 'Remove',
      selected: [],
      onChange: fn(),
      options: OPTIONS,
      open: false,
      onOpenChange: fn(),
   },
   render: (args) => <Interactive {...args} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

const Interactive = (args: ComponentProps<typeof MultiSelectCombobox>) => {
   const [selected, setSelected] = useState(args.selected ?? []);
   const [open, setOpen] = useState(args.open ?? false);

   return (
      <MultiSelectCombobox
         {...args}
         selected={selected}
         onChange={setSelected}
         open={open}
         onOpenChange={setOpen}
      />
   );
};

export const Default: Story = {};

export const WithSelection: Story = {
   args: { selected: OPTIONS.slice(0, 2) },
};

export const Sortable: Story = {
   args: { selected: OPTIONS.slice(0, 3), moveLabel: 'Move' },
};

export const Disabled: Story = {
   args: { selected: OPTIONS.slice(0, 2), moveLabel: 'Move', disabled: true },
};

export const OpenMenu: Story = {
   args: { open: true, selected: OPTIONS.slice(0, 1) },
};

export const Loading: Story = {
   args: { open: true, loading: true, options: [] },
};

export const LoadError: Story = {
   args: { open: true, error: true, options: [] },
};

export const NoOptions: Story = {
   args: { open: true, options: [] },
};

export const Truncated: Story = {
   args: { open: true, totalCount: 240 },
};

export const LongLabels: Story = {
   args: {
      selected: [
         { id: 10, label: 'A very long tag label that takes most of the available width' },
         { id: 11, label: 'Another quite long tag label for wrapping' },
      ],
   },
};
