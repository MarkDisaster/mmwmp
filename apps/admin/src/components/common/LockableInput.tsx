import { Lock, Unlock } from 'lucide-react';
import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type LockableInputProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'disabled'> & {
   value: string;
   onChange: (value: string) => void;
   isLocked: boolean;
   onToggleLock: () => void;
   toggleLabel: string;
};

const LockableInput = ({
   value,
   onChange,
   isLocked,
   onToggleLock,
   toggleLabel,
   ...inputProps
}: LockableInputProps) => {
   return (
      <div className="flex gap-2">
         <Input
            {...inputProps}
            value={value}
            disabled={isLocked}
            onChange={(e) => onChange(e.target.value)}
         />
         <Button
            type="button"
            variant={isLocked ? 'outline' : 'default'}
            size="icon"
            aria-label={toggleLabel}
            aria-pressed={isLocked}
            onClick={onToggleLock}
         >
            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
         </Button>
      </div>
   );
};

export { LockableInput };
