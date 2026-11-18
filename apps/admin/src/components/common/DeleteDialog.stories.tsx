import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';

import { DeleteDialog } from '@/components/common/DeleteDialog';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof DeleteDialog> = {
   title: 'Common/DeleteDialog',
   component: DeleteDialog,
   tags: ['autodocs'],
   args: {
      open: false,
      onOpenChange: fn(),
      onConfirm: fn(),
      isPending: false,
      title: 'Delete project?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
   },
   render: (args) => <Trigger {...args} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

const Trigger = (args: ComponentProps<typeof DeleteDialog>) => {
   const [open, setOpen] = useState(false);
   return (
      <>
         <Button variant="destructive" onClick={() => setOpen(true)}>
            Delete
         </Button>
         <DeleteDialog
            {...args}
            open={open}
            onOpenChange={setOpen}
            onConfirm={() => setOpen(false)}
         />
      </>
   );
};

export const Default: Story = {};

export const Pending: Story = {
   args: { isPending: true },
   render: (args) => <DeleteDialog {...args} open onOpenChange={() => undefined} />,
};
