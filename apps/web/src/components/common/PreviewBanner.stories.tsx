import type { Meta, StoryObj } from '@storybook/nextjs';

import { PreviewBanner } from './PreviewBanner';

const meta = {
   title: 'Common/PreviewBanner',
   component: PreviewBanner,
   tags: ['autodocs'],
   parameters: {
      layout: 'fullscreen',
      docs: {
         description: {
            component:
               'Fixed-position banner shown when Next.js draft preview mode is enabled. Uses brand surface — contrast verified in both light and dark themes.',
         },
      },
   },
} satisfies Meta<typeof PreviewBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
