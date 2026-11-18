import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { PhoneInput } from './phone-input';

const meta: Meta<typeof PhoneInput> = {
   title: 'UI/PhoneInput',
   component: PhoneInput,
   tags: ['autodocs'],
   decorators: [
      (Story) => (
         <div className="w-72">
            <Story />
         </div>
      ),
   ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = ({ initial, disabled }: { initial: string; disabled?: boolean }) => {
   const [value, setValue] = useState(initial);
   return <PhoneInput value={value} onChange={setValue} disabled={disabled} />;
};

export const Default: Story = {
   render: () => <Controlled initial="" />,
};

export const Filled: Story = {
   render: () => <Controlled initial="+420777123456" />,
};

export const Disabled: Story = {
   render: () => <Controlled initial="+420777123456" disabled />,
};
