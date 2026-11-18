import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';

const meta = {
   title: 'UI/Button',
   component: Button,
   tags: ['autodocs'],
   argTypes: {
      variant: {
         control: { type: 'select' },
         options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      },
      size: {
         control: { type: 'select' },
         options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
      },
      disabled: { control: 'boolean' },
      children: { control: 'text' },
   },
   args: {
      children: 'Save changes',
      variant: 'default',
      size: 'default',
   },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Destructive: Story = { args: { variant: 'destructive', children: 'Delete' } };
export const Outline: Story = { args: { variant: 'outline', children: 'Cancel' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Secondary' } };
export const Ghost: Story = { args: { variant: 'ghost', children: 'Settings' } };
export const Link: Story = { args: { variant: 'link', children: 'Learn more' } };

export const Disabled: Story = { args: { disabled: true, children: 'Saving…' } };

export const AllVariants: Story = {
   render: () => (
      <div className="flex flex-wrap gap-2">
         <Button variant="default">Default</Button>
         <Button variant="destructive">Destructive</Button>
         <Button variant="outline">Outline</Button>
         <Button variant="secondary">Secondary</Button>
         <Button variant="ghost">Ghost</Button>
         <Button variant="link">Link</Button>
      </div>
   ),
};

export const AllSizes: Story = {
   render: () => (
      <div className="flex items-center gap-2">
         <Button size="xs">xs</Button>
         <Button size="sm">sm</Button>
         <Button size="default">default</Button>
         <Button size="lg">lg</Button>
      </div>
   ),
};
