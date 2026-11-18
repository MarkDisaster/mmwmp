import 'react-phone-number-input/style.css';

import { cn } from '@mm/utils/cn';
import type { Props } from 'react-phone-number-input';
import PhoneInputPrimitive from 'react-phone-number-input';

type PhoneInputProps = Omit<Props<{ placeholder?: string }>, 'onChange'> & {
   onChange?: (value: string) => void;
   placeholder?: string;
};

const PhoneInput = ({ className, onChange, ...props }: PhoneInputProps) => {
   return (
      <PhoneInputPrimitive
         international
         defaultCountry="CZ"
         className={cn(
            'phone-input flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-base shadow-xs md:text-sm',
            'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
            className,
         )}
         onChange={(value) => onChange?.(value ?? '')}
         {...props}
      />
   );
};
PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
