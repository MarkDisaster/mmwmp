import type { Meta, StoryObj } from '@storybook/nextjs';

import { SectionHeader } from './SectionHeader';

const meta = {
   title: 'Common/SectionHeader',
   component: SectionHeader,
   tags: ['autodocs'],
   args: { href: '/projects', title: 'Projects' },
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Projects: Story = { args: { href: '/projects', title: 'Projects' } };
export const About: Story = { args: { href: '/about', title: 'O mně' } };
export const Contact: Story = { args: { href: '/contact', title: 'Kontakt' } };
export const PageTitle: Story = {
   args: { href: '/projects', title: 'Projects', isPageTitle: true },
   parameters: {
      docs: {
         description: { story: 'Rendered as the page `<h1>`; looks the same as the others.' },
      },
   },
};
