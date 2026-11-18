import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './checkbox';
import { Input } from './input';
import { Label } from './label';

const meta = {
   title: 'UI/Label',
   component: Label,
   tags: ['autodocs'],
   args: { children: 'Email' },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInput: Story = {
   render: (args) => (
      <div className="grid w-64 gap-2">
         <Label {...args} htmlFor="email" />
         <Input id="email" type="email" placeholder="name@example.com" />
      </div>
   ),
};

export const WithDisabledControl: Story = {
   render: (args) => (
      <div className="flex items-center gap-2">
         <Checkbox id="terms" disabled className="peer" />
         <Label {...args} htmlFor="terms">
            Accept the terms
         </Label>
      </div>
   ),
};
