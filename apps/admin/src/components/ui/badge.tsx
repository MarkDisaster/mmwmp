import { cn } from '@mm/utils/cn';
import { Slot } from '@radix-ui/react-slot';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { badgeVariants } from './variants';

function Badge({
   className,
   variant = 'default',
   asChild = false,
   ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
   const Comp = asChild ? Slot : 'span';

   return (
      <Comp
         data-slot="badge"
         data-variant={variant}
         className={cn(badgeVariants({ variant }), className)}
         {...props}
      />
   );
}

export { Badge };
