import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './checkbox';
import { Label } from './label';

const meta = {
   title: 'UI/Checkbox',
   component: Checkbox,
   tags: ['autodocs'],
   argTypes: {
      disabled: { control: 'boolean' },
   },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
   render: () => (
      <div className="flex items-center gap-2">
         <Checkbox id="terms" />
         <Label htmlFor="terms">Accept terms and conditions</Label>
      </div>
   ),
};

export const Checked: Story = {
   render: () => (
      <div className="flex items-center gap-2">
         <Checkbox id="newsletter" defaultChecked />
         <Label htmlFor="newsletter">Subscribe to newsletter</Label>
      </div>
   ),
};

export const Disabled: Story = {
   render: () => (
      <div className="flex flex-col gap-3">
         <div className="flex items-center gap-2">
            <Checkbox id="d1" disabled />
            <Label htmlFor="d1">Disabled (unchecked)</Label>
         </div>
         <div className="flex items-center gap-2">
            <Checkbox id="d2" disabled defaultChecked />
            <Label htmlFor="d2">Disabled (checked)</Label>
         </div>
      </div>
   ),
};
