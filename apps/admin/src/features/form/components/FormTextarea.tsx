import type { ComponentProps, ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

type FormTextareaProps = ComponentProps<typeof Textarea> & {
   name: string;
   label?: string;
   labelAction?: ReactNode;
   formItemClassName?: string;
};

const FormTextarea = ({
   name,
   label,
   labelAction,
   formItemClassName,
   ...textareaProps
}: FormTextareaProps) => {
   const { control } = useFormContext();

   return (
      <FormField
         control={control}
         name={name}
         render={({ field }) => (
            <FormItem className={formItemClassName}>
               {label && (
                  <div className="flex items-center justify-between">
                     <FormLabel>{label}</FormLabel>
                     {labelAction}
                  </div>
               )}
               <FormControl>
                  <Textarea {...field} value={field.value ?? ''} {...textareaProps} />
               </FormControl>
               <FormMessage />
            </FormItem>
         )}
      />
   );
};

export { FormTextarea };
