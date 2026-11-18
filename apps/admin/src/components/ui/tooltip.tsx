import { cn } from '@mm/utils/cn';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

const TOOLTIP_CONTENT_CLASS =
   'bg-foreground text-background z-50 w-fit max-w-72 rounded-md border-transparent px-3 py-1.5 text-xs text-balance';

const TOOLTIP_ARROW_CLASS =
   'bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]';

const TOOLTIP_SIDE_OFFSET = 0;

const TOOLTIP_EDGE_PADDING = 16;

const TOOLTIP_ALIGN = 'start';
const TOOLTIP_ALIGN_OFFSET = -16;

const TOOLTIP_ARROW_PADDING = 8;

const TOOLTIP_DEFAULT_SIDE = 'top';

const TooltipProvider = ({
   delayDuration = 300,
   ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) => (
   <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />
);

const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = ({
   className,
   side = TOOLTIP_DEFAULT_SIDE,
   align = TOOLTIP_ALIGN,
   alignOffset = TOOLTIP_ALIGN_OFFSET,
   sideOffset = TOOLTIP_SIDE_OFFSET,
   children,
   ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) => (
   <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
         side={side}
         align={align}
         alignOffset={alignOffset}
         sideOffset={sideOffset}
         collisionPadding={TOOLTIP_EDGE_PADDING}
         onClick={(e) => e.stopPropagation()}
         arrowPadding={TOOLTIP_ARROW_PADDING}
         className={cn(
            TOOLTIP_CONTENT_CLASS,
            'origin-(--radix-tooltip-content-transform-origin) animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            className,
         )}
         {...props}
      >
         {children}
         <TooltipPrimitive.Arrow className={TOOLTIP_ARROW_CLASS} />
      </TooltipPrimitive.Content>
   </TooltipPrimitive.Portal>
);

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
