import type { Meta, StoryObj } from '@storybook/react-vite';

import { LanguageBadge } from '@/components/common/LanguageBadge';

const meta = {
   title: 'Common/LanguageBadge',
   component: LanguageBadge,
   tags: ['autodocs'],
   args: { language: 'cs' },
} satisfies Meta<typeof LanguageBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiple: Story = {
   render: () => (
      <div className="flex gap-1">
         <LanguageBadge language="cs" />
         <LanguageBadge language="en" />
      </div>
   ),
};
