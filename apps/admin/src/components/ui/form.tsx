import { cn } from '@mm/utils/cn';
import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps } from 'react';
import { createContext, useContext, useId } from 'react';
import type { ControllerProps, FieldPath, FieldValues } from 'react-hook-form';
import { Controller, FormProvider, useFormContext } from 'react-hook-form';

import { Label } from './label';

const Form = FormProvider;

type FormFieldContextValue<
   TFieldValues extends FieldValues = FieldValues,
   TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
   name: TName;
};

const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
   TFieldValues extends FieldValues = FieldValues,
   TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
   ...props
}: ControllerProps<TFieldValues, TName>) => {
   return (
      <FormFieldContext.Provider value={{ name: props.name }}>
         <Controller {...props} />
      </FormFieldContext.Provider>
   );
};

type FormItemContextValue = {
   id: string;
};

const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue);

const useFormField = () => {
   const fieldContext = useContext(FormFieldContext);
   const itemContext = useContext(FormItemContext);
   const { getFieldState, formState } = useFormContext();

   if (!fieldContext.name) {
      throw new Error('useFormField should be used within <FormField>');
   }

   const fieldState = getFieldState(fieldContext.name, formState);
   const { id } = itemContext;

   return {
      id,
      name: fieldContext.name,
      formItemId: `${id}-form-item`,
      formDescriptionId: `${id}-form-item-description`,
      formMessageId: `${id}-form-item-message`,
      ...fieldState,
   };
};

const FormItem = ({ className, ...props }: ComponentProps<'div'>) => {
   const id = useId();

   return (
      <FormItemContext.Provider value={{ id }}>
         <div data-slot="form-item" className={cn('space-y-2', className)} {...props} />
      </FormItemContext.Provider>
   );
};

const FormLabel = ({ className, ...props }: ComponentProps<typeof Label>) => {
   const { error, formItemId } = useFormField();

   return (
      <Label
         data-slot="form-label"
         data-error={!!error}
         className={cn('data-[error=true]:text-destructive', className)}
         htmlFor={formItemId}
         {...props}
      />
   );
};

const FormControl = ({ ...props }: ComponentProps<typeof Slot>) => {
   const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

   return (
      <Slot
         data-slot="form-control"
         id={formItemId}
         aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
         aria-invalid={!!error}
         {...props}
      />
   );
};

const FormDescription = ({ className, ...props }: ComponentProps<'p'>) => {
   const { formDescriptionId } = useFormField();

   return (
      <p
         data-slot="form-description"
         id={formDescriptionId}
         className={cn('text-sm text-muted-foreground', className)}
         {...props}
      />
   );
};

const FormMessage = ({ className, children, ...props }: ComponentProps<'p'>) => {
   const { error, formMessageId } = useFormField();
   const body = error ? String(error?.message ?? '') : children;

   if (!body) {
      return null;
   }

   return (
      <p
         data-slot="form-message"
         id={formMessageId}
         className={cn('text-sm text-destructive', className)}
         {...props}
      >
         {body}
      </p>
   );
};

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage };
