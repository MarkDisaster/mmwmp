import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { FormDialog } from '@/components/common/FormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const meta = {
   title: 'Common/FormDialog',
   component: FormDialog,
   tags: ['autodocs'],
   args: { open: false, onClose: () => undefined, title: 'Create tag', children: null },
   render: (args) => <Trigger {...args} />,
} satisfies Meta<typeof FormDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const Trigger = ({ title, maxWidth }: { title: string; maxWidth?: string }) => {
   const [open, setOpen] = useState(false);
   return (
      <>
         <Button onClick={() => setOpen(true)}>Open dialog</Button>
         <FormDialog open={open} onClose={() => setOpen(false)} title={title} maxWidth={maxWidth}>
            <div className="grid gap-2">
               <Label htmlFor="tag-name">Name</Label>
               <Input id="tag-name" />
            </div>
            <div className="flex justify-end">
               <Button onClick={() => setOpen(false)}>Save</Button>
            </div>
         </FormDialog>
      </>
   );
};

export const Default: Story = {};

export const Wide: Story = {
   args: { maxWidth: 'sm:max-w-2xl' },
};

export const LongTitle: Story = {
   args: { title: 'Create a tag with a rather long title that wraps onto several lines' },
};
