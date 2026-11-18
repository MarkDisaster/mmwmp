import { cn } from '@mm/utils/cn';

import { Skeleton } from '@/components/ui/skeleton';

import { SkeletonCardGrid } from './SkeletonCardGrid';
import { SkeletonTable } from './SkeletonTable';

type SkeletonListPageProps = {
   actions?: string[];
   filters?: string[];
} & (
   | { variant: 'grid'; card: 'file' | 'project' }
   | {
        variant?: 'table';
        cols: number;
        reorder?: boolean;
        rowContent?: 'text' | 'actions' | 'thumbnail';
     }
);

export const SkeletonListPage = ({ actions = [], filters, ...content }: SkeletonListPageProps) => (
   <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
         <Skeleton className="mr-auto h-8 w-40" />
         <div className="flex flex-wrap items-center gap-3">
            {actions.map((action, i) => (
               <Skeleton key={i} className={cn('h-9', action)} />
            ))}
         </div>
      </div>
      {filters && (
         <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter, i) => (
               <Skeleton key={i} className={cn('h-9', filter)} />
            ))}
         </div>
      )}
      {content.variant === 'grid' ? (
         <SkeletonCardGrid card={content.card} />
      ) : (
         <SkeletonTable
            cols={content.cols}
            reorder={content.reorder}
            rowContent={content.rowContent}
         />
      )}
   </div>
);
