import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { NewerVersionNotice } from '@/components/common/NewerVersionNotice';

const meta = {
   title: 'Common/NewerVersionNotice',
   component: NewerVersionNotice,
   tags: ['autodocs'],
   args: { visible: true, onReload: fn() },
} satisfies Meta<typeof NewerVersionNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Reloading: Story = { args: { isReloading: true } };

export const Hidden: Story = { args: { visible: false } };
