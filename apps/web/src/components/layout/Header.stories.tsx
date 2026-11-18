import type { Meta, StoryObj } from '@storybook/nextjs';

import { Header } from './Header';

const meta = {
   title: 'Layout/Header',
   component: Header,
   tags: ['autodocs'],
   parameters: {
      layout: 'fullscreen',
      docs: {
         description: {
            component:
               'Fixed top header — Logo on the left, menu button on the right. When menu is open, also shows LanguageSwitcher and ThemeToggle in brand-overlay mode.',
         },
      },
   },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
   render: () => (
      <div style={{ minHeight: '200vh' }}>
         <Header />
         <div className="bg-background p-12 text-foreground">
            Scroll content — header is fixed-position.
         </div>
      </div>
   ),
};
