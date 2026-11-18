import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToggleGroup, ToggleGroupItem } from './toggle-group';

const meta = {
   title: 'UI/ToggleGroup',
   component: ToggleGroup,
   tags: ['autodocs'],
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
   args: { type: 'single', defaultValue: 'left' },
   render: (args) => (
      <ToggleGroup {...args}>
         <ToggleGroupItem value="left" aria-label="Align left">
            L
         </ToggleGroupItem>
         <ToggleGroupItem value="center" aria-label="Align center">
            C
         </ToggleGroupItem>
         <ToggleGroupItem value="right" aria-label="Align right">
            R
         </ToggleGroupItem>
      </ToggleGroup>
   ),
};

export const Multiple: Story = {
   args: { type: 'multiple', defaultValue: ['bold'] },
   render: (args) => (
      <ToggleGroup {...args}>
         <ToggleGroupItem value="bold" aria-label="Toggle bold">
            B
         </ToggleGroupItem>
         <ToggleGroupItem value="italic" aria-label="Toggle italic">
            I
         </ToggleGroupItem>
         <ToggleGroupItem value="underline" aria-label="Toggle underline">
            U
         </ToggleGroupItem>
      </ToggleGroup>
   ),
};
