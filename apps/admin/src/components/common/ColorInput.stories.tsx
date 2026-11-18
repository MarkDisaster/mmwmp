import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';

import { ColorInput } from '@/components/common/ColorInput';

const meta: Meta<typeof ColorInput> = {
   title: 'Common/ColorInput',
   component: ColorInput,
   tags: ['autodocs'],
   args: { value: '#013cfe', onChange: fn() },
   render: (args) => <Controlled {...args} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = (args: ComponentProps<typeof ColorInput>) => {
   const [value, setValue] = useState(args.value ?? '');
   return <ColorInput {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {};

export const Empty: Story = {
   args: { value: '' },
};

export const Invalid: Story = {
   args: { 'aria-invalid': true },
};

export const Disabled: Story = {
   args: { disabled: true },
};
