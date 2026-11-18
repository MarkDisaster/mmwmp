import type { Meta, StoryObj } from '@storybook/react-vite';

import { QueryErrorState } from '@/components/common/QueryErrorState';

const meta = {
   title: 'Common/QueryErrorState',
   component: QueryErrorState,
   tags: ['autodocs'],
   args: { onRetry: () => undefined },
} satisfies Meta<typeof QueryErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Retrying: Story = { args: { isRetrying: true } };
