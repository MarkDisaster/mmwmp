import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './input';
import { Label } from './label';

const meta = {
   title: 'UI/Input',
   component: Input,
   tags: ['autodocs'],
   argTypes: {
      disabled: { control: 'boolean' },
      placeholder: { control: 'text' },
      type: {
         control: { type: 'select' },
         options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
      },
   },
   args: { placeholder: 'Enter text…' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
   render: () => (
      <div className="grid w-72 gap-1.5">
         <Label htmlFor="email">Email</Label>
         <Input id="email" type="email" placeholder="you@example.com" />
      </div>
   ),
};

export const Password: Story = { args: { type: 'password', placeholder: '••••••••' } };
export const Disabled: Story = { args: { disabled: true, placeholder: 'Disabled input' } };

export const Invalid: Story = {
   render: () => (
      <div className="grid w-72 gap-1.5">
         <Label htmlFor="username">Username</Label>
         <Input id="username" aria-invalid placeholder="username" defaultValue="not-valid" />
         <p className="text-sm text-destructive">Username must contain only letters and numbers.</p>
      </div>
   ),
};
