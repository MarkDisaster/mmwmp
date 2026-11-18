import { cn } from '@mm/utils/cn';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type InfoHintProps = {
   label: string;
   children: ReactNode;
   className?: string;
};

export const InfoHint = ({ label, children, className }: InfoHintProps) => {
   const [open, setOpen] = useState(false);
   const touched = useRef(false);

   return (
      <TooltipProvider>
         <Tooltip open={open} onOpenChange={setOpen}>
            <TooltipTrigger asChild>
               <span
                  className={cn(
                     'relative inline-flex size-3.5 shrink-0 cursor-help items-center justify-center rounded-full p-0 text-muted-foreground',
                     'after:absolute after:-inset-[5px] after:content-[""]',
                     'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                     className,
                  )}
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                  onPointerDown={(e) => {
                     touched.current = e.pointerType !== 'mouse';
                  }}
                  onKeyDown={(e) => {
                     if (e.key !== 'Enter' && e.key !== ' ') return;
                     e.preventDefault();
                     setOpen((current) => !current);
                  }}
                  onClick={(e) => {
                     if (!touched.current) return;
                     e.preventDefault();
                     setOpen((current) => !current);
                  }}
               >
                  <Info className="size-3.5" />
               </span>
            </TooltipTrigger>
            <TooltipContent>{children}</TooltipContent>
         </Tooltip>
      </TooltipProvider>
   );
};
