import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from './button';
import {
   Form,
   FormControl,
   FormDescription,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
} from './form';
import { Input } from './input';

const meta: Meta<typeof Form> = {
   title: 'UI/Form',
   component: Form,
   tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

type Values = { name: string };

const NameForm = ({ error, disabled }: { error?: string; disabled?: boolean }) => {
   const form = useForm<Values>({ defaultValues: { name: error ? '' : 'Marek Media' } });

   const { setError } = form;
   useEffect(() => {
      if (error) setError('name', { type: 'required', message: error });
   }, [error, setError]);

   return (
      <Form {...form}>
         <form onSubmit={form.handleSubmit(() => undefined)} className="w-72 space-y-4">
            <FormField
               control={form.control}
               name="name"
               render={({ field }) => (
                  <FormItem>
                     <FormLabel>Project name</FormLabel>
                     <FormControl>
                        <Input {...field} disabled={disabled} />
                     </FormControl>
                     <FormDescription>Shown in the project list.</FormDescription>
                     <FormMessage />
                  </FormItem>
               )}
            />
            <Button type="submit" disabled={disabled}>
               Save
            </Button>
         </form>
      </Form>
   );
};

export const Default: Story = {
   render: () => <NameForm />,
};

export const WithError: Story = {
   render: () => <NameForm error="Name is required" />,
};

export const Disabled: Story = {
   render: () => <NameForm disabled />,
};
