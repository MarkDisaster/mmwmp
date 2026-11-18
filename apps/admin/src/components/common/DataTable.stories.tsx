import type { Meta, StoryObj } from '@storybook/react-vite';
import {
   type ColumnDef,
   getCoreRowModel,
   getPaginationRowModel,
   getSortedRowModel,
   useReactTable,
} from '@tanstack/react-table';

import { DataTable } from '@/components/common/DataTable';
import { NoResults } from '@/components/common/NoResults';
import { StatusBadge } from '@/components/common/StatusBadge';

type Project = { id: number; name: string; status: 'draft' | 'published'; views: number };

const PROJECTS: Project[] = Array.from({ length: 25 }, (_, i) => ({
   id: i + 1,
   name: `Project ${i + 1}`,
   status: i % 3 === 0 ? 'draft' : 'published',
   views: (i * 137) % 1000,
}));

const COLUMNS: ColumnDef<Project>[] = [
   { accessorKey: 'name', header: 'Name' },
   {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
         <StatusBadge
            status={row.original.status}
            label={row.original.status === 'draft' ? 'Draft' : 'Published'}
         />
      ),
   },
   { accessorKey: 'views', header: 'Views' },
];

type DemoProps = {
   data: Project[];
   isFetching?: boolean;
   clickable?: boolean;
   reorderable?: boolean;
   emptyState?: 'records' | 'results';
};

const Demo = ({ data, isFetching, clickable, reorderable, emptyState }: DemoProps) => {
   const table = useReactTable({
      data,
      columns: COLUMNS,
      getRowId: (row) => String(row.id),
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
   });

   return (
      <DataTable
         table={table}
         isFetching={isFetching}
         onRowClick={clickable ? () => undefined : undefined}
         reorder={reorderable ? { onReorder: () => undefined } : undefined}
         emptyState={emptyState === 'results' ? <NoResults /> : undefined}
      />
   );
};

const meta: Meta<typeof DataTable> = {
   title: 'Common/DataTable',
   component: DataTable,
   tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
   render: () => <Demo data={PROJECTS} />,
};

export const ClickableRows: Story = {
   render: () => <Demo data={PROJECTS} clickable />,
};

export const Reorderable: Story = {
   render: () => <Demo data={PROJECTS.slice(0, 5)} reorderable />,
};

export const Fetching: Story = {
   render: () => <Demo data={PROJECTS} isFetching />,
};

export const Empty: Story = {
   render: () => <Demo data={[]} />,
};

export const EmptyAfterSearch: Story = {
   render: () => <Demo data={[]} emptyState="results" />,
};
