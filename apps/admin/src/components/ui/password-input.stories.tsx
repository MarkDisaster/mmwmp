import type { Meta, StoryObj } from '@storybook/react-vite';

import { PasswordInput } from './password-input';

const meta = {
   title: 'UI/PasswordInput',
   component: PasswordInput,
   tags: ['autodocs'],
   decorators: [
      (Story) => (
         <div className="w-72">
            <Story />
         </div>
      ),
   ],
   args: { placeholder: 'Password' },
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: 'correct horse battery staple' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'secret' } };
export const Invalid: Story = { args: { 'aria-invalid': true, defaultValue: 'short' } };
