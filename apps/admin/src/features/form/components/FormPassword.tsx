import type { ComponentProps } from 'react';
import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';

type FormPasswordProps = ComponentProps<typeof PasswordInput> & {
   name: string;
   label?: string;
   formItemClassName?: string;
};

const FormPassword = ({ name, label, formItemClassName, ...inputProps }: FormPasswordProps) => {
   const { control } = useFormContext();

   return (
      <FormField
         control={control}
         name={name}
         render={({ field }) => (
            <FormItem className={formItemClassName}>
               {label && <FormLabel>{label}</FormLabel>}
               <FormControl>
                  <PasswordInput {...field} value={field.value ?? ''} {...inputProps} />
               </FormControl>
               <FormMessage />
            </FormItem>
         )}
      />
   );
};

export { FormPassword };
