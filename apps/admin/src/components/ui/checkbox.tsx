import { cn } from '@mm/utils/cn';
import type { ComponentProps } from 'react';

function Checkbox({ className, ...props }: ComponentProps<'input'>) {
   return (
      <input
         type="checkbox"
         data-slot="checkbox"
         className={cn(
            'h-4 w-4 shrink-0 rounded border border-input bg-white accent-primary shadow-xs transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            className,
         )}
         {...props}
      />
   );
}

export { Checkbox };
