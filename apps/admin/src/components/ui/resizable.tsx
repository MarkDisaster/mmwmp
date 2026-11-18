import { cn } from '@mm/utils/cn';
import { GripVerticalIcon } from 'lucide-react';
import * as ResizablePrimitive from 'react-resizable-panels';

const ResizablePanelGroup = ({ className, ...props }: ResizablePrimitive.GroupProps) => (
   <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn('flex h-full w-full aria-[orientation=vertical]:flex-col', className)}
      {...props}
   />
);

const ResizablePanel = ({ ...props }: ResizablePrimitive.PanelProps) => (
   <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
);

const ResizableHandle = ({
   withHandle,
   className,
   ...props
}: ResizablePrimitive.SeparatorProps & { withHandle?: boolean }) => (
   <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
         'group relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 after:transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 data-[separator=active]:after:bg-primary data-[separator=hover]:after:bg-primary [&[aria-orientation=horizontal]>div]:rotate-90',
         className,
      )}
      {...props}
   >
      {withHandle && (
         <div className="z-10 flex h-4 w-3 items-center justify-center rounded-xs border bg-border transition-colors group-data-[separator=active]:border-primary group-data-[separator=active]:bg-primary group-data-[separator=active]:text-primary-foreground group-data-[separator=hover]:border-primary group-data-[separator=hover]:bg-primary group-data-[separator=hover]:text-primary-foreground">
            <GripVerticalIcon className="size-2.5" />
         </div>
      )}
   </ResizablePrimitive.Separator>
);

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
