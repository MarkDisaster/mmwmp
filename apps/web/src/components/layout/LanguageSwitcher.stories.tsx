import type { Decorator, Meta, StoryObj } from '@storybook/nextjs';

import { LanguageSwitcher } from './LanguageSwitcher';

const wrapInBrandSurface: Decorator = (Story) => (
   <div className="bg-brand p-8">
      <Story />
   </div>
);

const meta: Meta<typeof LanguageSwitcher> = {
   title: 'Layout/LanguageSwitcher',
   component: LanguageSwitcher,
   tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnBrand: Story = {
   args: { onBrand: true },
   decorators: [wrapInBrandSurface],
};
