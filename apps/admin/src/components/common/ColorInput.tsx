import { cn } from '@mm/utils/cn';
import type { ComponentProps, FocusEvent } from 'react';
import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

type ColorInputProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
   value: string;
   onChange: (value: string) => void;
};

const ColorInput = ({
   value,
   onChange,
   onBlur,
   placeholder,
   className,
   ...inputProps
}: ColorInputProps) => {
   const { t } = useTranslation();
   const [draft, setDraft] = useState<string | null>(null);
   const [prevValue, setPrevValue] = useState(value);

   if (value !== prevValue) {
      setPrevValue(value);
      setDraft(null);
   }

   const handleInputChange = (raw: string) => {
      if (HEX_COLOR.test(raw)) {
         setDraft(null);
         onChange(raw);
      } else {
         setDraft(raw);
      }
   };

   const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      setDraft(null);
      onBlur?.(e);
   };

   return (
      <div className="flex items-center gap-2">
         <Popover>
            <PopoverTrigger asChild>
               <button
                  type="button"
                  className="h-9 w-9 shrink-0 rounded-md border shadow-xs"
                  style={{ backgroundColor: value || '#000000' }}
                  aria-label={t('common.pickColor')}
               />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
               <HexColorPicker color={value || '#000000'} onChange={onChange} />
            </PopoverContent>
         </Popover>

         <Input
            {...inputProps}
            value={draft ?? value}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleBlur}
            aria-invalid={draft !== null || inputProps['aria-invalid']}
            placeholder={placeholder ?? '#000000'}
            className={cn('max-w-36 font-mono uppercase', className)}
         />
      </div>
   );
};

export { ColorInput };
