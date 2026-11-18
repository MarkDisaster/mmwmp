import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import {
   Pagination,
   PaginationButton,
   PaginationContent,
   PaginationEllipsis,
   PaginationItem,
   PaginationNext,
   PaginationPrevious,
} from './pagination';

const meta = {
   title: 'UI/Pagination',
   component: Pagination,
   tags: ['autodocs'],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

const PageList = ({ pageCount, initial }: { pageCount: number; initial: number }) => {
   const [page, setPage] = useState(initial);
   const pages = Array.from({ length: pageCount }, (_, i) => i);

   return (
      <Pagination aria-label="Pages">
         <PaginationContent>
            <PaginationItem>
               <PaginationPrevious disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Previous
               </PaginationPrevious>
            </PaginationItem>
            {pages.map((i) => (
               <PaginationItem key={i}>
                  <PaginationButton
                     isActive={i === page}
                     aria-label={`Page ${i + 1}`}
                     onClick={() => setPage(i)}
                  >
                     {i + 1}
                  </PaginationButton>
               </PaginationItem>
            ))}
            <PaginationItem>
               <PaginationNext disabled={page === pageCount - 1} onClick={() => setPage(page + 1)}>
                  Next
               </PaginationNext>
            </PaginationItem>
         </PaginationContent>
      </Pagination>
   );
};

export const Default: Story = {
   render: () => <PageList pageCount={5} initial={1} />,
};

export const FirstPage: Story = {
   render: () => <PageList pageCount={5} initial={0} />,
};

export const LastPage: Story = {
   render: () => <PageList pageCount={5} initial={4} />,
};

export const WithEllipsis: Story = {
   render: () => (
      <Pagination aria-label="Pages">
         <PaginationContent>
            <PaginationItem>
               <PaginationPrevious>Previous</PaginationPrevious>
            </PaginationItem>
            <PaginationItem>
               <PaginationButton>1</PaginationButton>
            </PaginationItem>
            <PaginationItem>
               <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
               <PaginationButton isActive>7</PaginationButton>
            </PaginationItem>
            <PaginationItem>
               <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
               <PaginationButton>20</PaginationButton>
            </PaginationItem>
            <PaginationItem>
               <PaginationNext>Next</PaginationNext>
            </PaginationItem>
         </PaginationContent>
      </Pagination>
   ),
};
