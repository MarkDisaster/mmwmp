import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';

import { LockableInput } from '@/components/common/LockableInput';

const meta: Meta<typeof LockableInput> = {
   title: 'Common/LockableInput',
   component: LockableInput,
   tags: ['autodocs'],
   decorators: [
      (Story) => (
         <div className="w-80">
            <Story />
         </div>
      ),
   ],
   args: {
      value: 'marek-media',
      onChange: fn(),
      isLocked: true,
      onToggleLock: fn(),
      toggleLabel: 'Lock slug',
   },
   render: (args) => <Interactive {...args} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

const Interactive = (args: ComponentProps<typeof LockableInput>) => {
   const [value, setValue] = useState(args.value ?? '');
   const [locked, setLocked] = useState(args.isLocked ?? false);

   return (
      <LockableInput
         {...args}
         value={value}
         onChange={setValue}
         isLocked={locked}
         onToggleLock={() => setLocked((prev) => !prev)}
      />
   );
};

export const Locked: Story = {};
export const Unlocked: Story = { args: { isLocked: false } };
export const Empty: Story = { args: { isLocked: false, value: '', placeholder: 'slug' } };
export const Invalid: Story = { args: { isLocked: false, 'aria-invalid': true } };
