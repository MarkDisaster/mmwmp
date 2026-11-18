import type { Meta, StoryObj } from '@storybook/react-vite';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

const meta = {
   title: 'UI/Select',
   component: Select,
   tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
   render: () => (
      <Select>
         <SelectTrigger className="w-60">
            <SelectValue placeholder="Select a fruit" />
         </SelectTrigger>
         <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="cherry">Cherry</SelectItem>
            <SelectItem value="dragon">Dragon fruit</SelectItem>
         </SelectContent>
      </Select>
   ),
};

export const WithDefaultValue: Story = {
   render: () => (
      <Select defaultValue="banana">
         <SelectTrigger className="w-60">
            <SelectValue />
         </SelectTrigger>
         <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="cherry">Cherry</SelectItem>
         </SelectContent>
      </Select>
   ),
};
