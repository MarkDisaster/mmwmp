import { cn } from '@mm/utils/cn';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table';

const PROJECT_ROWS = 5;
const PROJECT_COLUMNS = 3;

const StatsCardSkeleton = ({ items }: { items: number }) => (
   <Card>
      <CardHeader>
         <Skeleton className="h-6 w-28" />
      </CardHeader>
      <CardContent>
         <div className="grid gap-6 sm:grid-cols-3">
            {Array.from({ length: items }).map((_, index) => (
               <div key={index} className="space-y-2">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-9 w-16" />
               </div>
            ))}
         </div>
      </CardContent>
   </Card>
);

const SectionHeadingSkeleton = ({ className }: { className: string }) => (
   <div className="flex h-7 items-center gap-2">
      <Skeleton className="size-5" />
      <Skeleton className={cn('h-5', className)} />
   </div>
);

export const DashboardSkeleton = () => (
   <div className="space-y-6" aria-busy="true">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
         <Skeleton className="mr-auto h-8 w-40" />
         <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-32" />
         </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
         {Array.from({ length: 2 }).map((_, index) => (
            <StatsCardSkeleton key={index} items={index === 0 ? 3 : 2} />
         ))}
      </div>

      <Card>
         <CardContent>
            <Skeleton className="h-32 w-full" />
         </CardContent>
      </Card>

      <div className="space-y-3">
         <SectionHeadingSkeleton className="w-40" />
         <Table>
            <TableHeader>
               <TableRow>
                  {Array.from({ length: PROJECT_COLUMNS }).map((_, index) => (
                     <TableHead key={index}>
                        <Skeleton className="h-5 w-24" />
                     </TableHead>
                  ))}
               </TableRow>
            </TableHeader>
            <TableBody>
               {Array.from({ length: PROJECT_ROWS }).map((_, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-transparent">
                     {Array.from({ length: PROJECT_COLUMNS }).map((_, columnIndex) => (
                        <TableCell key={columnIndex}>
                           <Skeleton className="h-[22px] w-full" />
                        </TableCell>
                     ))}
                  </TableRow>
               ))}
            </TableBody>
         </Table>
      </div>
   </div>
);
