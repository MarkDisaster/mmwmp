import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetHeader,
   SheetTitle,
   SheetTrigger,
} from './sheet';

const meta = {
   title: 'UI/Sheet',
   component: Sheet,
   tags: ['autodocs'],
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FromRight: Story = {
   render: () => (
      <Sheet>
         <SheetTrigger asChild>
            <Button variant="outline">Open sheet</Button>
         </SheetTrigger>
         <SheetContent>
            <SheetHeader>
               <SheetTitle>Edit profile</SheetTitle>
               <SheetDescription>
                  Make changes to your profile. Click save when done.
               </SheetDescription>
            </SheetHeader>
            <div className="p-4 text-sm text-muted-foreground">Sheet body content goes here.</div>
         </SheetContent>
      </Sheet>
   ),
};
