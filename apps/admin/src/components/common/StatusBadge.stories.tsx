import type { Meta, StoryObj } from '@storybook/react-vite';

import { StatusBadge } from '@/components/common/StatusBadge';

const meta = {
   title: 'Common/StatusBadge',
   component: StatusBadge,
   tags: ['autodocs'],
   argTypes: { status: { control: { type: 'select' }, options: ['draft', 'published'] } },
   args: { status: 'published', label: 'Published' },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Published: Story = {};
export const Draft: Story = { args: { status: 'draft', label: 'Draft' } };
