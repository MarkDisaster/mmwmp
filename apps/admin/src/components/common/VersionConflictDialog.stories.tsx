import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { VersionConflictDialog } from '@/components/common/VersionConflictDialog';

const meta = {
   title: 'Common/VersionConflictDialog',
   component: VersionConflictDialog,
   tags: ['autodocs'],
   args: { open: true, onOpenChange: fn(), onReload: fn() },
} satisfies Meta<typeof VersionConflictDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Reloading: Story = { args: { isReloading: true } };
