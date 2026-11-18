import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from './badge';
import {
   Table,
   TableBody,
   TableCaption,
   TableCell,
   TableFooter,
   TableHead,
   TableHeader,
   TableRow,
} from './table';

const meta = {
   title: 'UI/Table',
   component: Table,
   tags: ['autodocs'],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const ROWS = [
   { name: 'Marek Media website', status: 'Published', views: 1240 },
   { name: 'Admin CMS', status: 'Draft', views: 0 },
   { name: 'Runner game', status: 'Published', views: 380 },
];

export const Default: Story = {
   render: () => (
      <Table>
         <TableCaption>Projects</TableCaption>
         <TableHeader>
            <TableRow>
               <TableHead>Name</TableHead>
               <TableHead>Status</TableHead>
               <TableHead className="text-right">Views</TableHead>
            </TableRow>
         </TableHeader>
         <TableBody>
            {ROWS.map((row) => (
               <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                     <Badge variant={row.status === 'Published' ? 'default' : 'secondary'}>
                        {row.status}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right">{row.views}</TableCell>
               </TableRow>
            ))}
         </TableBody>
         <TableFooter>
            <TableRow>
               <TableCell colSpan={2}>Total</TableCell>
               <TableCell className="text-right">1620</TableCell>
            </TableRow>
         </TableFooter>
      </Table>
   ),
};

export const SelectedRow: Story = {
   render: () => (
      <Table>
         <TableHeader>
            <TableRow>
               <TableHead>Name</TableHead>
               <TableHead>Status</TableHead>
            </TableRow>
         </TableHeader>
         <TableBody>
            <TableRow data-state="selected">
               <TableCell>Selected row</TableCell>
               <TableCell>Published</TableCell>
            </TableRow>
            <TableRow>
               <TableCell>Another row</TableCell>
               <TableCell>Draft</TableCell>
            </TableRow>
         </TableBody>
      </Table>
   ),
};

export const Empty: Story = {
   render: () => (
      <Table>
         <TableHeader>
            <TableRow>
               <TableHead>Name</TableHead>
               <TableHead>Status</TableHead>
            </TableRow>
         </TableHeader>
         <TableBody>
            <TableRow>
               <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  No records.
               </TableCell>
            </TableRow>
         </TableBody>
      </Table>
   ),
};

export const OverflowingContent: Story = {
   decorators: [
      (Story) => (
         <div className="w-80">
            <Story />
         </div>
      ),
   ],
   render: () => (
      <Table>
         <TableHeader>
            <TableRow>
               <TableHead>Name</TableHead>
               <TableHead>Description</TableHead>
            </TableRow>
         </TableHeader>
         <TableBody>
            <TableRow>
               <TableCell>Long</TableCell>
               <TableCell>
                  A very long description that does not wrap, so the table scrolls horizontally
               </TableCell>
            </TableRow>
         </TableBody>
      </Table>
   ),
};
