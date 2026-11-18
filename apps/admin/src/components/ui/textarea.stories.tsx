import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './label';
import { Textarea } from './textarea';

const meta = {
   title: 'UI/Textarea',
   component: Textarea,
   tags: ['autodocs'],
   argTypes: {
      disabled: { control: 'boolean' },
      placeholder: { control: 'text' },
      rows: { control: { type: 'number', min: 1, max: 20 } },
   },
   args: { placeholder: 'Write your message…', rows: 4 },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
   render: () => (
      <div className="grid w-96 gap-1.5">
         <Label htmlFor="message">Message</Label>
         <Textarea id="message" placeholder="Type your message…" />
      </div>
   ),
};

export const Disabled: Story = { args: { disabled: true } };
