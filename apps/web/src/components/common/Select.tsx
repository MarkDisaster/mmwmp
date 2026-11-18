'use client';

import { cn } from '@mm/utils/cn';
import * as RadixSelect from '@radix-ui/react-select';

type SelectOption<T extends string> = {
   value: T;
   label: string;
};

type SelectProps<T extends string> = {
   value: T;
   onChange: (value: T) => void;
   options: SelectOption<T>[];
   ariaLabel?: string;
   disabled?: boolean;
   align?: 'start' | 'center' | 'end';
   onBrand?: boolean;
};

export function Select<T extends string>({
   value,
   onChange,
   options,
   ariaLabel,
   disabled,
   align = 'start',
   onBrand = false,
}: SelectProps<T>) {
   return (
      <RadixSelect.Root value={value} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
         <RadixSelect.Trigger
            aria-label={ariaLabel}
            className={cn(
               'flex items-center gap-1 text-base font-bold uppercase outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid',
               onBrand
                  ? 'text-fixed-white focus-visible:outline-fixed-white'
                  : 'text-foreground hover:text-brand focus-visible:outline-brand',
            )}
         >
            <RadixSelect.Value />
            <RadixSelect.Icon>▾</RadixSelect.Icon>
         </RadixSelect.Trigger>
         <RadixSelect.Portal>
            <RadixSelect.Content
               position="popper"
               align={align}
               sideOffset={8}
               className={cn(
                  'z-70 overflow-hidden border bg-transparent',
                  onBrand ? 'border-fixed-white' : 'border-border',
               )}
            >
               <RadixSelect.Viewport>
                  {options.map((opt) => (
                     <RadixSelect.Item
                        key={opt.value}
                        value={opt.value}
                        className={cn(
                           'cursor-pointer px-4 py-2 text-xs font-bold uppercase outline-none',
                           onBrand
                              ? 'text-fixed-white data-highlighted:bg-fixed-white data-highlighted:text-brand dark:data-highlighted:bg-fixed-black dark:data-highlighted:text-fixed-white'
                              : 'text-foreground data-highlighted:bg-brand data-highlighted:text-fixed-white',
                        )}
                     >
                        <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                     </RadixSelect.Item>
                  ))}
               </RadixSelect.Viewport>
            </RadixSelect.Content>
         </RadixSelect.Portal>
      </RadixSelect.Root>
   );
}
