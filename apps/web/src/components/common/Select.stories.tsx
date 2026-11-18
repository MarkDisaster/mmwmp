import type { Meta, StoryObj } from '@storybook/nextjs';
import { useState } from 'react';

import { Select } from './Select';

const LANG_OPTIONS = [
   { value: 'cs', label: 'CS' },
   { value: 'en', label: 'EN' },
];

const SORT_OPTIONS = [
   { value: 'recent', label: 'Recent' },
   { value: 'oldest', label: 'Oldest' },
   { value: 'name', label: 'Name' },
];

const meta = {
   title: 'Common/Select',
   component: Select,
   tags: ['autodocs'],
   args: {
      value: 'cs',
      onChange: () => undefined,
      options: LANG_OPTIONS,
      onBrand: false,
      align: 'start',
   },
   argTypes: {
      onBrand: { control: 'boolean' },
      disabled: { control: 'boolean' },
      align: {
         control: { type: 'select' },
         options: ['start', 'center', 'end'],
      },
   },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

function LanguageSelectDemo(args: React.ComponentProps<typeof Select>) {
   const [value, setValue] = useState('cs');
   return <Select {...args} value={value} onChange={setValue} options={LANG_OPTIONS} />;
}

function SortSelectDemo(args: React.ComponentProps<typeof Select>) {
   const [value, setValue] = useState('recent');
   return <Select {...args} value={value} onChange={setValue} options={SORT_OPTIONS} />;
}

function OnBrandSelectDemo(args: React.ComponentProps<typeof Select>) {
   const [value, setValue] = useState('cs');
   return (
      <div className="bg-brand p-8">
         <Select {...args} value={value} onChange={setValue} options={LANG_OPTIONS} />
      </div>
   );
}

export const Language: Story = { render: (args) => <LanguageSelectDemo {...args} /> };
export const SortBy: Story = { render: (args) => <SortSelectDemo {...args} /> };
export const OnBrandSurface: Story = {
   args: { onBrand: true },
   render: (args) => <OnBrandSelectDemo {...args} />,
};
