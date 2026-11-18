import type { Meta, StoryObj } from '@storybook/nextjs';

import { Button } from '@/components/common/Button';

import { HeroFrame } from './HeroFrame';

const meta = {
   title: 'Features/Home/HeroFrame',
   component: HeroFrame,
   tags: ['autodocs'],
   parameters: { layout: 'fullscreen' },
   args: {
      top1: 'MAREK',
      top2: 'MAREK',
      bottom1: 'Software',
      bottom2: 'developer',
      cta: <Button>Kontakt</Button>,
   },
} satisfies Meta<typeof HeroFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
