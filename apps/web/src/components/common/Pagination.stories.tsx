import type { Meta, StoryObj } from '@storybook/nextjs';

import { Pagination } from './Pagination';

const meta = {
   title: 'Common/Pagination',
   component: Pagination,
   tags: ['autodocs'],
   args: { currentPage: 1, totalPages: 5, basePath: '/projects' },
   argTypes: {
      currentPage: { control: { type: 'number', min: 1 } },
      totalPages: { control: { type: 'number', min: 1, max: 50 } },
      basePath: { control: 'text' },
   },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = { args: { currentPage: 1, totalPages: 5 } };
export const MiddlePage: Story = { args: { currentPage: 3, totalPages: 5 } };
export const LastPage: Story = { args: { currentPage: 5, totalPages: 5 } };
export const ManyPages: Story = { args: { currentPage: 7, totalPages: 20 } };
export const SinglePage: Story = {
   args: { currentPage: 1, totalPages: 1 },
   parameters: { docs: { description: { story: 'Renders nothing when only one page.' } } },
};
