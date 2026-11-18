import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const meta = {
   title: 'UI/Popover',
   component: Popover,
   tags: ['autodocs'],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
   render: () => (
      <Popover>
         <PopoverTrigger asChild>
            <Button variant="outline">Open settings</Button>
         </PopoverTrigger>
         <PopoverContent className="w-80">
            <div className="grid gap-3">
               <div className="space-y-1">
                  <h4 className="leading-none font-medium">Dimensions</h4>
                  <p className="text-sm text-muted-foreground">Set the width and height.</p>
               </div>
               <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-2">
                     <Label htmlFor="width">Width</Label>
                     <Input id="width" defaultValue="100%" className="col-span-2 h-8" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-2">
                     <Label htmlFor="height">Height</Label>
                     <Input id="height" defaultValue="25px" className="col-span-2 h-8" />
                  </div>
               </div>
            </div>
         </PopoverContent>
      </Popover>
   ),
};
