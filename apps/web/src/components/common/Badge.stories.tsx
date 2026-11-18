import type { Meta, StoryObj } from '@storybook/nextjs';

import { Badge } from './Badge';

const meta = {
   title: 'Common/Badge',
   component: Badge,
   tags: ['autodocs'],
   args: { children: 'New' },
   argTypes: {
      children: { control: 'text' },
      asChild: { control: 'boolean' },
   },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Long: Story = { args: { children: 'Featured project' } };

export const AsLink: Story = {
   args: {
      asChild: true,
      children: <a href="https://example.com">Live demo</a>,
   },
};

export const Collection: Story = {
   render: () => (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
         <Badge>New</Badge>
         <Badge>Featured</Badge>
         <Badge>Case study</Badge>
         <Badge>2024</Badge>
      </div>
   ),
};
