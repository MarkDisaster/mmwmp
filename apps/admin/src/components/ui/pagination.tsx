import { cn } from '@mm/utils/cn';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import type { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/variants';

function Pagination({ className, ...props }: ComponentProps<'nav'>) {
   return (
      <nav
         data-slot="pagination"
         className={cn('mx-auto flex w-full justify-center', className)}
         {...props}
      />
   );
}

function PaginationContent({ className, ...props }: ComponentProps<'ul'>) {
   return (
      <ul
         data-slot="pagination-content"
         className={cn('flex flex-row items-center gap-1', className)}
         {...props}
      />
   );
}

function PaginationItem({ ...props }: ComponentProps<'li'>) {
   return <li data-slot="pagination-item" {...props} />;
}

type PaginationButtonProps = {
   isActive?: boolean;
} & Pick<ComponentProps<typeof Button>, 'size'> &
   ComponentProps<'button'>;

function PaginationButton({
   className,
   isActive,
   size = 'icon',
   disabled,
   onClick,
   ...props
}: PaginationButtonProps) {
   return (
      <button
         type="button"
         aria-current={isActive ? 'page' : undefined}
         aria-disabled={disabled || undefined}
         data-slot="pagination-button"
         data-active={isActive}
         onClick={disabled ? undefined : onClick}
         className={cn(
            buttonVariants({
               variant: isActive ? 'outline' : 'ghost',
               size,
            }),
            'aria-disabled:pointer-events-none aria-disabled:opacity-50',
            className,
         )}
         {...props}
      />
   );
}

function PaginationPrevious({
   className,
   children,
   ...props
}: ComponentProps<typeof PaginationButton>) {
   return (
      <PaginationButton
         size="default"
         className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
         {...props}
      >
         <ChevronLeftIcon />
         <span className="sr-only sm:not-sr-only">{children}</span>
      </PaginationButton>
   );
}

function PaginationNext({
   className,
   children,
   ...props
}: ComponentProps<typeof PaginationButton>) {
   return (
      <PaginationButton
         size="default"
         className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
         {...props}
      >
         <span className="sr-only sm:not-sr-only">{children}</span>
         <ChevronRightIcon />
      </PaginationButton>
   );
}

function PaginationEllipsis({ className, ...props }: ComponentProps<'span'>) {
   return (
      <span
         aria-hidden
         data-slot="pagination-ellipsis"
         className={cn('flex size-9 items-center justify-center', className)}
         {...props}
      >
         <MoreHorizontalIcon className="size-4" />
      </span>
   );
}

export {
   Pagination,
   PaginationButton,
   PaginationContent,
   PaginationEllipsis,
   PaginationItem,
   PaginationNext,
   PaginationPrevious,
};
