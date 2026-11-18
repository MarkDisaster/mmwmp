import { cn } from '@mm/utils/cn';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { InfoHint } from '@/components/common/InfoHint';

const EMPTY_VALUE = '—';

type StatItemProps = {
   title: string;
   value: number | string;
   hint?: string;
   href?: string;
   icon?: ReactNode;
   valueClassName?: string;
   loading?: boolean;
   error?: string;
};

export const StatItem = ({
   title,
   value,
   hint,
   href,
   icon,
   valueClassName,
   loading,
   error,
}: StatItemProps) => {
   const isEmpty = loading || error !== undefined;

   const item = (
      <div className={cn('min-w-0', href && 'transition-opacity duration-300 hover:opacity-70')}>
         <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {icon}
            <span>{title}</span>
            {hint && <InfoHint label={title}>{hint}</InfoHint>}
         </div>
         <p
            className={cn(
               'mt-2 text-3xl font-bold',
               isEmpty ? 'text-muted-foreground' : valueClassName,
               loading && 'animate-pulse',
            )}
         >
            {isEmpty ? EMPTY_VALUE : value}
         </p>
         {error !== undefined && <p className="mt-1 text-sm text-destructive">{error}</p>}
      </div>
   );

   if (href) {
      return (
         <Link to={href} className="block no-underline">
            {item}
         </Link>
      );
   }

   return item;
};
