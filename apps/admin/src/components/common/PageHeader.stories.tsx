import type { Meta, StoryObj } from '@storybook/react-vite';

import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';

const meta = {
   title: 'Common/PageHeader',
   component: PageHeader,
   tags: ['autodocs'],
   args: { title: 'Projects' },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithActions: Story = {
   args: {
      actions: (
         <>
            <Button variant="outline">Preview</Button>
            <Button>New project</Button>
         </>
      ),
   },
};

export const WithBadgeAndActions: Story = {
   args: {
      title: 'Marek Media website',
      badge: <StatusBadge status="draft" label="Draft" />,
      actions: (
         <>
            <Button variant="outline">Save draft</Button>
            <Button>Publish</Button>
         </>
      ),
   },
};

export const LongTitle: Story = {
   args: {
      title: 'A project with a very long title that does not fit next to the actions',
      actions: <Button>Publish</Button>,
   },
};
