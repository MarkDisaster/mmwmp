import { cn } from '@mm/utils/cn';
import type { ReactNode } from 'react';

type DetailPageGridProps = {
   children: ReactNode;
   columns?: boolean;
   className?: string;
};

export function DetailPageGrid({ children, columns = true, className }: DetailPageGridProps) {
   return (
      <div
         className={cn(
            'grid grid-cols-[minmax(0,1fr)] gap-12.5',
            columns && 'lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-x-36',
            className,
         )}
      >
         {children}
      </div>
   );
}
