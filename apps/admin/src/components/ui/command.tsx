import { cn } from '@mm/utils/cn';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';

const Command = ({ className, ...props }: ComponentProps<typeof CommandPrimitive>) => (
   <CommandPrimitive
      className={cn(
         'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
         className,
      )}
      {...props}
   />
);

const CommandInput = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) => (
   <div className="flex items-center border-b px-3">
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
         className={cn(
            'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
            className,
         )}
         {...props}
      />
   </div>
);

const CommandList = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) => (
   <CommandPrimitive.List
      className={cn('max-h-[300px] overflow-x-hidden overflow-y-auto', className)}
      {...props}
   />
);

const CommandEmpty = (props: ComponentProps<typeof CommandPrimitive.Empty>) => (
   <CommandPrimitive.Empty className="py-6 text-center text-sm" {...props} />
);

const CommandGroup = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) => (
   <CommandPrimitive.Group
      className={cn(
         '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
         className,
      )}
      {...props}
   />
);

const CommandItem = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) => (
   <CommandPrimitive.Item
      className={cn(
         'relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
         className,
      )}
      {...props}
   />
);

export { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList };
