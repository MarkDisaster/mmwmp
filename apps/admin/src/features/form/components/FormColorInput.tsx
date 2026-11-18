import { useFormContext } from 'react-hook-form';

import { ColorInput } from '@/components/common/ColorInput';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

type FormColorInputProps = {
   name: string;
   label?: string;
   placeholder?: string;
   formItemClassName?: string;
};

const FormColorInput = ({ name, label, placeholder, formItemClassName }: FormColorInputProps) => {
   const { control } = useFormContext();

   return (
      <FormField
         control={control}
         name={name}
         render={({ field }) => (
            <FormItem className={formItemClassName}>
               {label && <FormLabel>{label}</FormLabel>}
               <FormControl>
                  <ColorInput
                     value={field.value ?? ''}
                     onChange={field.onChange}
                     placeholder={placeholder}
                  />
               </FormControl>
               <FormMessage />
            </FormItem>
         )}
      />
   );
};

export { FormColorInput };
