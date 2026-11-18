import { cn } from '@mm/utils/cn';
import type { ReactNode } from 'react';

type CardGridProps = {
   children: ReactNode;
   className?: string;
};

const COLUMNS =
   'grid-cols-1 gap-4 @lg:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4 @[90rem]:grid-cols-5 @[110rem]:grid-cols-6';

export const CardGrid = ({ children, className }: CardGridProps) => {
   return (
      <div className="@container">
         <div className={cn('grid', COLUMNS, className)}>{children}</div>
      </div>
   );
};
