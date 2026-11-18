import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PhoneInput } from '@/components/ui/phone-input';

type FormPhoneProps = {
   name: string;
   label?: string;
   placeholder?: string;
};

const FormPhone = ({ name, label, placeholder }: FormPhoneProps) => {
   const { control } = useFormContext();

   return (
      <FormField
         control={control}
         name={name}
         render={({ field }) => (
            <FormItem>
               {label && <FormLabel>{label}</FormLabel>}
               <FormControl>
                  <PhoneInput
                     value={field.value}
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

export { FormPhone };
