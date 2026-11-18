import { cn } from '@mm/utils/cn';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';

type FileNoticeProps = {
   tone: 'error' | 'success';
   title: string;
   detail?: string;
   children?: ReactNode;
};

export const FileNotice = ({ tone, title, detail, children }: FileNoticeProps) => {
   const Icon = tone === 'error' ? AlertCircle : CheckCircle2;

   return (
      <div
         className={cn(
            'flex items-start gap-3 rounded-md border p-3',
            tone === 'error' ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/30',
         )}
      >
         <Icon
            className={cn(
               'mt-0.5 h-5 w-5 shrink-0',
               tone === 'error' ? 'text-destructive' : 'text-primary',
            )}
         />
         <div className="min-w-0 space-y-2">
            <div>
               <p className="text-sm font-semibold">{title}</p>
               {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
            </div>
            {children}
         </div>
      </div>
   );
};
