import { useId } from 'react';
import { useController, useFormContext, useFormState } from 'react-hook-form';

import { GroupLabel } from '@/components/common/GroupLabel';
import { TextEditor } from '@/features/editor/components/TextEditor';

type FormRichTextProps = {
   name: string;
   label: string;
   disabled?: boolean;
};

const FormRichText = ({ name, label, disabled = false }: FormRichTextProps) => {
   const labelId = useId();
   const { control } = useFormContext();
   const {
      field: { value, onChange },
      fieldState: { error },
   } = useController({ control, name });
   const { isSubmitting } = useFormState({ control });

   return (
      <div className="space-y-2">
         <GroupLabel id={labelId}>{label}</GroupLabel>
         <TextEditor
            key={name}
            labelledBy={labelId}
            content={value ?? ''}
            onChange={onChange}
            disabled={isSubmitting || disabled}
         />
         {error?.message && <p className="text-sm text-destructive">{error.message}</p>}
      </div>
   );
};

export { FormRichText };
