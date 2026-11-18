import type { Meta, StoryObj } from '@storybook/react-vite';

import { Separator } from './separator';

const meta = {
   title: 'UI/Separator',
   component: Separator,
   tags: ['autodocs'],
   argTypes: {
      orientation: {
         control: { type: 'select' },
         options: ['horizontal', 'vertical'],
      },
   },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
   render: () => (
      <div className="w-96 space-y-3">
         <p>Above the separator</p>
         <Separator />
         <p>Below the separator</p>
      </div>
   ),
};

export const Vertical: Story = {
   render: () => (
      <div className="flex h-8 items-center space-x-3">
         <span>Left</span>
         <Separator orientation="vertical" />
         <span>Right</span>
      </div>
   ),
};
