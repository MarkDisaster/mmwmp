import type { Meta, StoryObj } from '@storybook/react-vite';

import { ReadOnlyNotice } from '@/components/common/ReadOnlyNotice';

const meta = {
   title: 'Common/ReadOnlyNotice',
   component: ReadOnlyNotice,
   tags: ['autodocs'],
   args: { message: 'Your role cannot edit a published project.' },
} satisfies Meta<typeof ReadOnlyNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongMessage: Story = {
   args: {
      message:
         'Your role cannot edit a published project. Ask an administrator to unpublish it first, or to grant your role the permission to publish and edit published records.',
   },
};
