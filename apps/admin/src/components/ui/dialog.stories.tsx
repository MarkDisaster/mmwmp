import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from './dialog';
import { Input } from './input';
import { Label } from './label';

const meta = {
   title: 'UI/Dialog',
   component: Dialog,
   tags: ['autodocs'],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
   render: () => (
      <Dialog>
         <DialogTrigger asChild>
            <Button>Edit profile</Button>
         </DialogTrigger>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Edit profile</DialogTitle>
               <DialogDescription>
                  Make changes to your profile here. Click save when done.
               </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
               <div className="grid gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" defaultValue="Marek Marek" />
               </div>
               <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="hello@marek.media" />
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline">Cancel</Button>
               <Button>Save changes</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   ),
};
