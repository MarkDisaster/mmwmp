import * as Dialog from '@radix-ui/react-dialog';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { AnimatePresence } from 'motion/react';

import { LanguageSwitcher } from './LanguageSwitcher';
import { Menu } from './Menu';
import { ThemeToggle } from './ThemeToggle';

const meta: Meta<typeof Menu> = {
   title: 'Layout/Menu',
   component: Menu,
   tags: ['autodocs'],
   parameters: { layout: 'fullscreen' },
   args: { menuButtonCenter: { x: 1100, y: 40 } },
   render: (args) => (
      <Dialog.Root open>
         <AnimatePresence>
            <Menu {...args} />
         </AnimatePresence>
      </Dialog.Root>
   ),
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
   args: { header: null },
};

export const WithHeaderControls: Story = {
   args: {
      header: (
         <div className="fixed top-4 right-4 z-60 flex items-center gap-4">
            <LanguageSwitcher onBrand />
            <ThemeToggle />
         </div>
      ),
   },
};
