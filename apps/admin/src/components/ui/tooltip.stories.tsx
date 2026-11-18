import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pencil, Trash2 } from 'lucide-react';

import { InfoHint } from '../common/InfoHint';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

const meta: Meta<typeof Tooltip> = {
   title: 'UI/Tooltip',
   component: Tooltip,
   tags: ['autodocs'],
   decorators: [
      (Story) => (
         <TooltipProvider>
            <div className="flex min-h-40 items-end gap-6 p-8">
               <Story />
            </div>
         </TooltipProvider>
      ),
   ],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const IconButton: Story = {
   render: () => (
      <Tooltip>
         <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Edit">
               <Pencil />
            </Button>
         </TooltipTrigger>
         <TooltipContent>Edit</TooltipContent>
      </Tooltip>
   ),
};

export const Destructive: Story = {
   render: () => (
      <Tooltip>
         <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Delete">
               <Trash2 />
            </Button>
         </TooltipTrigger>
         <TooltipContent>Delete</TooltipContent>
      </Tooltip>
   ),
};

export const InfoIcon: Story = {
   render: () => (
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
         Errors
         <InfoHint label="Errors">Replies that failed because of an AI service error.</InfoHint>
      </div>
   ),
};

export const NearTheEdge: Story = {
   render: () => (
      <div className="flex w-full justify-end">
         <InfoHint label="Edge">
            A long hint next to the right edge of the window stays inside it.
         </InfoHint>
      </div>
   ),
};
