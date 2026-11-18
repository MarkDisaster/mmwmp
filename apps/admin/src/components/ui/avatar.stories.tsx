import type { Meta, StoryObj } from '@storybook/react-vite';

import { Avatar, AvatarFallback, AvatarImage } from './avatar';

const meta = {
   title: 'UI/Avatar',
   component: Avatar,
   tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
   render: () => (
      <Avatar>
         <AvatarImage src="https://placehold.co/100x100" alt="Marek Marek" />
         <AvatarFallback>MM</AvatarFallback>
      </Avatar>
   ),
};

export const FallbackOnly: Story = {
   render: () => (
      <Avatar>
         <AvatarFallback>MM</AvatarFallback>
      </Avatar>
   ),
};

export const Group: Story = {
   render: () => (
      <div className="flex -space-x-2">
         <Avatar>
            <AvatarFallback>MM</AvatarFallback>
         </Avatar>
         <Avatar>
            <AvatarFallback>JK</AvatarFallback>
         </Avatar>
         <Avatar>
            <AvatarFallback>AL</AvatarFallback>
         </Avatar>
      </div>
   ),
};
