import { cn } from '@mm/utils/cn';

import { Skeleton } from '@/components/ui/skeleton';
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

type SkeletonTableProps = {
   cols: number;
   rows?: number;
   reorder?: boolean;
   rowContent?: 'text' | 'actions' | 'thumbnail';
};

const SkeletonPagination = () => (
   <div className="flex items-center justify-between px-2 py-4">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-8 w-36" />
   </div>
);

export const SkeletonTable = ({
   cols,
   rows = DEFAULT_PAGE_SIZE,
   reorder,
   rowContent = 'text',
}: SkeletonTableProps) => (
   <div>
      <Table>
         <TableHeader>
            <TableRow>
               {reorder && <TableHead className="w-10" />}
               {Array.from({ length: cols }).map((_, i) => (
                  <TableHead key={i}>
                     <Skeleton className="h-4 w-20" />
                  </TableHead>
               ))}
            </TableRow>
         </TableHeader>
         <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
               <TableRow key={i} className="hover:bg-transparent">
                  {reorder && (
                     <TableCell className="w-10">
                        <Skeleton className="h-4 w-4" />
                     </TableCell>
                  )}
                  {Array.from({ length: cols }).map((_, j) => (
                     <TableCell key={j}>
                        <Skeleton
                           className={cn(
                              'h-5 w-full',
                              j === 0 && rowContent === 'thumbnail' && 'h-10 w-10',
                              j === cols - 1 && rowContent !== 'text' && 'h-8',
                           )}
                        />
                     </TableCell>
                  ))}
               </TableRow>
            ))}
         </TableBody>
      </Table>
      <SkeletonPagination />
   </div>
);
