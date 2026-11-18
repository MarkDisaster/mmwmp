import { cn } from '@mm/utils/cn';
import { Slot } from '@radix-ui/react-slot';
import type { ReactNode } from 'react';

type BadgeProps = {
   children: ReactNode;
   className?: string;
   asChild?: boolean;
};

const VISUAL_CLASS =
   'rounded-full h-fit border-2 border-border px-4 py-1 text-[0.65rem] font-semibold uppercase text-foreground';

export function Badge({ children, className, asChild }: BadgeProps) {
   const Component = asChild ? Slot : 'span';

   return <Component className={cn(VISUAL_CLASS, className)}>{children}</Component>;
}
