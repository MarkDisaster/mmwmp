import { cn } from '@mm/utils/cn';
import type { VariantProps } from 'class-variance-authority';
import { Toggle as TogglePrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { toggleVariants } from './variants';

function Toggle({
   className,
   variant,
   size,
   ...props
}: ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
   return (
      <TogglePrimitive.Root
         data-slot="toggle"
         className={cn(toggleVariants({ variant, size, className }))}
         {...props}
      />
   );
}

export { Toggle };
