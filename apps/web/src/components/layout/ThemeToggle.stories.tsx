import type { Decorator, Meta, StoryObj } from '@storybook/nextjs';

import { ThemeToggle } from './ThemeToggle';

const wrapInBrandSurface: Decorator = (Story) => (
   <div className="bg-brand p-8">
      <Story />
   </div>
);

const meta: Meta<typeof ThemeToggle> = {
   title: 'Layout/ThemeToggle',
   component: ThemeToggle,
   tags: ['autodocs'],
   decorators: [wrapInBrandSurface],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
