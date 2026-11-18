import { cn } from '@mm/utils/cn';
import { Eye, EyeOff } from 'lucide-react';
import type { ComponentProps } from 'react';
import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from './input';

const PasswordInput = forwardRef<HTMLInputElement, ComponentProps<typeof Input>>(
   ({ className, ...props }, ref) => {
      const { t } = useTranslation();
      const [showPassword, setShowPassword] = useState(false);

      return (
         <div className="relative">
            <Input
               ref={ref}
               type={showPassword ? 'text' : 'password'}
               className={cn('pr-10', className)}
               {...props}
            />
            <button
               type="button"
               onClick={() => setShowPassword((prev) => !prev)}
               className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
               aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
            >
               {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
         </div>
      );
   },
);

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
