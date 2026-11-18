import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { LockableInput } from '@/components/common/LockableInput';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

type FormLockableInputProps = {
   name: string;
   label?: string;
   isLocked: boolean;
   onToggleLock: () => void;
   lockedLabel: string;
   unlockedLabel: string;
   formItemClassName?: string;
   onValueChange?: (value: string) => void;
};

const FormLockableInput = ({
   name,
   label,
   isLocked,
   onToggleLock,
   lockedLabel,
   unlockedLabel,
   formItemClassName,
   onValueChange,
}: FormLockableInputProps) => {
   const { t } = useTranslation();
   const { control } = useFormContext();

   return (
      <FormField
         control={control}
         name={name}
         render={({ field }) => (
            <FormItem className={formItemClassName}>
               {label && (
                  <FormLabel>
                     {label} ({isLocked ? lockedLabel : unlockedLabel})
                  </FormLabel>
               )}
               <FormControl>
                  <LockableInput
                     value={field.value ?? ''}
                     onChange={(val) => {
                        field.onChange(val);
                        onValueChange?.(val);
                     }}
                     isLocked={isLocked}
                     onToggleLock={onToggleLock}
                     toggleLabel={t('common.fieldLock', { field: label ?? name })}
                  />
               </FormControl>
               <FormMessage />
            </FormItem>
         )}
      />
   );
};

export { FormLockableInput };
