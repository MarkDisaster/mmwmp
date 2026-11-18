import type { Meta, StoryObj } from '@storybook/nextjs';

import { Button } from './Button';

const meta = {
   title: 'Common/Button',
   component: Button,
   tags: ['autodocs'],
   argTypes: {
      size: {
         control: { type: 'select' },
         options: ['sm', 'md', 'lg'],
      },
      asChild: { control: 'boolean' },
      children: { control: 'text' },
   },
   args: {
      children: 'Přečíst',
      size: 'md',
   },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
   args: { size: 'sm', children: 'Více' },
};

export const Large: Story = {
   args: { size: 'lg', children: 'Kontakt' },
};

export const AsLink: Story = {
   args: {
      asChild: true,
      children: <a href="/projects/sample">Přečíst</a>,
   },
};

export const AllSizes: Story = {
   render: () => (
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
         <Button size="sm">Více</Button>
         <Button size="md">Přečíst</Button>
         <Button size="lg">Kontakt</Button>
      </div>
   ),
};
