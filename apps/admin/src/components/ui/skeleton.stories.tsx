import type { Meta, StoryObj } from '@storybook/react-vite';

import { Skeleton } from './skeleton';

const meta = {
   title: 'UI/Skeleton',
   component: Skeleton,
   tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
   render: () => <Skeleton className="h-4 w-72" />,
};

export const Card: Story = {
   render: () => (
      <div className="flex items-center gap-4">
         <Skeleton className="size-12 rounded-full" />
         <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
         </div>
      </div>
   ),
};

export const TableRow: Story = {
   render: () => (
      <div className="flex w-[400px] flex-col gap-3">
         {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
               <Skeleton className="size-10" />
               <Skeleton className="h-4 flex-1" />
               <Skeleton className="h-4 w-20" />
            </div>
         ))}
      </div>
   ),
};
