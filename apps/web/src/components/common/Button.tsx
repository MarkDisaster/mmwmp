import { cn } from '@mm/utils/cn';
import { Slot } from '@radix-ui/react-slot';
import type { ReactNode } from 'react';

type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
   children: ReactNode;
   className?: string;
   size?: ButtonSize;
   asChild?: boolean;
   onClick?: () => void;
   isPending?: boolean;
};

const VISUAL_CLASS =
   'flex items-center justify-center border-3 border-solid border-border bg-transparent font-bold uppercase text-foreground no-underline transition-all duration-400 hover:bg-brand hover:text-fixed-white hover:no-underline py-2 px-6 whitespace-nowrap';

const SIZE_CLASS: Record<ButtonSize, string> = {
   sm: 'text-sm',
   md: 'text-base',
   lg: 'text-lg',
};

export function Button({
   children,
   className,
   size = 'md',
   asChild,
   onClick,
   isPending,
}: ButtonProps) {
   const classes = cn(VISUAL_CLASS, SIZE_CLASS[size], className);

   if (asChild) {
      return (
         <Slot className={classes} onClick={onClick}>
            {children}
         </Slot>
      );
   }

   return (
      <button
         type="button"
         onClick={onClick}
         aria-busy={isPending || undefined}
         aria-disabled={isPending || undefined}
         className={classes}
      >
         {children}
      </button>
   );
}
