import type { Meta, StoryObj } from '@storybook/react-vite';

import { FormSection } from '@/components/common/FormSection';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const meta = {
   title: 'Common/FormSection',
   component: FormSection,
   tags: ['autodocs'],
   args: { title: 'SEO', children: null },
   render: (args) => (
      <div className="max-w-md">
         <FormSection {...args}>
            <div className="grid gap-2">
               <Label htmlFor="slug">Slug</Label>
               <Input id="slug" defaultValue="marek-media" />
            </div>
            <div className="grid gap-2">
               <Label htmlFor="meta">Meta title</Label>
               <Input id="meta" />
            </div>
         </FormSection>
      </div>
   ),
} satisfies Meta<typeof FormSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongTitle: Story = {
   args: { title: 'Search engine optimisation and social media sharing preview' },
};
