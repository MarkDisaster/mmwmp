import type { Meta, StoryObj } from '@storybook/react-vite';

import { NoRecords } from '@/components/common/NoRecords';

const meta = {
   title: 'Common/NoRecords',
   component: NoRecords,
   tags: ['autodocs'],
} satisfies Meta<typeof NoRecords>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
   args: { action: { label: 'Create project', onClick: () => undefined } },
};
