import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';

import { SearchInput } from '@/components/common/SearchInput';

const meta: Meta<typeof SearchInput> = {
   title: 'Common/SearchInput',
   component: SearchInput,
   tags: ['autodocs'],
   args: { value: '', onChange: fn() },
   render: (args) => <Controlled {...args} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = (args: ComponentProps<typeof SearchInput>) => {
   const [value, setValue] = useState(args.value ?? '');
   return <SearchInput {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {};

export const WithValue: Story = { args: { value: 'marek' } };

export const CustomPlaceholder: Story = { args: { placeholder: 'Search projects...' } };

export const Wide: Story = { args: { className: 'w-96', value: 'a long search phrase' } };
