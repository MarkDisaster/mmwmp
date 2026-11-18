import type { Meta, StoryObj } from '@storybook/react-vite';

import { NoResults } from '@/components/common/NoResults';

const meta = {
   title: 'Common/NoResults',
   component: NoResults,
   tags: ['autodocs'],
} satisfies Meta<typeof NoResults>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
