import type { Meta, StoryObj } from '@storybook/react-vite';

import { Toggle } from './toggle';

const meta = {
   title: 'UI/Toggle',
   component: Toggle,
   tags: ['autodocs'],
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
   render: () => <Toggle aria-label="Toggle bold">B</Toggle>,
};

export const PressedDefault: Story = {
   render: () => (
      <Toggle aria-label="Toggle italic" defaultPressed>
         I
      </Toggle>
   ),
};

export const Disabled: Story = {
   render: () => (
      <Toggle aria-label="Toggle underline" disabled>
         U
      </Toggle>
   ),
};
