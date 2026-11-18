import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';

type SelectOption = {
   value: string;
   label: string;
};

type FormSelectProps = {
   name: string;
   label?: string;
   placeholder?: string;
   options: SelectOption[];
   formItemClassName?: string;
};

const FormSelect = ({ name, label, placeholder, options, formItemClassName }: FormSelectProps) => {
   const { control } = useFormContext();

   return (
      <FormField
         control={control}
         name={name}
         render={({ field }) => (
            <FormItem className={formItemClassName}>
               {label && <FormLabel>{label}</FormLabel>}
               <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={field.onChange}
               >
                  <FormControl>
                     <SelectTrigger>
                        <SelectValue placeholder={placeholder} />
                     </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                           {option.label}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
               <FormMessage />
            </FormItem>
         )}
      />
   );
};

export { FormSelect };
