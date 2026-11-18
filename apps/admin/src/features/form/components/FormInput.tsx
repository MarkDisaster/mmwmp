import type { ComponentProps } from 'react';
import { useFormContext } from 'react-hook-form';

import {
   FormControl,
   FormDescription,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type FormInputProps = ComponentProps<typeof Input> & {
   name: string;
   label?: string;
   description?: string;
   formItemClassName?: string;
};

const FormInput = ({
   name,
   label,
   description,
   formItemClassName,
   onChange,
   ...inputProps
}: FormInputProps) => {
   const { control } = useFormContext();

   return (
      <FormField
         control={control}
         name={name}
         render={({ field }) => (
            <FormItem className={formItemClassName}>
               {label && <FormLabel>{label}</FormLabel>}
               <FormControl>
                  <Input
                     {...field}
                     value={field.value ?? ''}
                     {...inputProps}
                     onChange={(e) => {
                        field.onChange(e);
                        onChange?.(e);
                     }}
                  />
               </FormControl>
               {description && <FormDescription>{description}</FormDescription>}
               <FormMessage />
            </FormItem>
         )}
      />
   );
};

export { FormInput };
