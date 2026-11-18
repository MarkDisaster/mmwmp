import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof ConfirmDialog> = {
   title: 'Common/ConfirmDialog',
   component: ConfirmDialog,
   tags: ['autodocs'],
   args: {
      open: false,
      onOpenChange: fn(),
      onConfirm: fn(),
      title: 'Publish project?',
      description: 'The project becomes visible on the public website.',
      confirmLabel: 'Publish',
      cancelLabel: 'Cancel',
   },
   render: (args) => <Trigger {...args} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

const Trigger = (args: ComponentProps<typeof ConfirmDialog>) => {
   const [open, setOpen] = useState(false);
   return (
      <>
         <Button variant="outline" onClick={() => setOpen(true)}>
            Open dialog
         </Button>
         <ConfirmDialog
            {...args}
            open={open}
            onOpenChange={setOpen}
            onConfirm={() => setOpen(false)}
         />
      </>
   );
};

export const Default: Story = {};

export const Destructive: Story = {
   args: {
      title: 'Discard changes?',
      description: 'Unsaved changes will be lost.',
      confirmLabel: 'Discard',
      destructive: true,
   },
};

export const Pending: Story = {
   args: { isPending: true },
   render: (args) => <ConfirmDialog {...args} open onOpenChange={() => undefined} />,
};

export const LongText: Story = {
   args: {
      title: 'Publish a project with a rather long title that wraps onto more lines?',
      description:
         'The project becomes visible on the public website, in the sitemap and in the search results. Translations that are still empty fall back to the default language until they are filled in.',
   },
};
