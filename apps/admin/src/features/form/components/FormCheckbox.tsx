import { useFormContext } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';

type FormCheckboxProps = {
   name: string;
   label: string;
};

const FormCheckbox = ({ name, label }: FormCheckboxProps) => {
   const { control } = useFormContext();

   return (
      <FormField
         control={control}
         name={name}
         render={({ field }) => (
            <FormItem>
               <div className="flex items-center gap-2">
                  <FormControl>
                     <Checkbox
                        id={field.name}
                        checked={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                     />
                  </FormControl>
                  <Label htmlFor={field.name}>{label}</Label>
               </div>
               <FormMessage />
            </FormItem>
         )}
      />
   );
};

export { FormCheckbox };
