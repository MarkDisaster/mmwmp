import type { Meta, StoryObj } from '@storybook/react-vite';
import { toast } from 'sonner';

import { Button } from './button';
import { Toaster } from './sonner';

const meta: Meta<typeof Toaster> = {
   title: 'UI/Sonner',
   component: Toaster,
   tags: ['autodocs'],
   decorators: [
      (Story) => (
         <>
            <Story />
            <Toaster />
         </>
      ),
   ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
   render: () => (
      <div className="flex flex-wrap gap-2">
         <Button variant="outline" onClick={() => toast('Event created')}>
            Default
         </Button>
         <Button variant="outline" onClick={() => toast.success('Project saved')}>
            Success
         </Button>
         <Button variant="outline" onClick={() => toast.info('A new version is available')}>
            Info
         </Button>
         <Button variant="outline" onClick={() => toast.warning('Unsaved changes')}>
            Warning
         </Button>
         <Button variant="outline" onClick={() => toast.error('Saving failed')}>
            Error
         </Button>
         <Button
            variant="outline"
            onClick={() =>
               toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
                  loading: 'Saving...',
                  success: 'Saved',
                  error: 'Failed',
               })
            }
         >
            Loading
         </Button>
      </div>
   ),
};

export const LongMessage: Story = {
   render: () => (
      <Button
         variant="outline"
         onClick={() =>
            toast.error(
               'Saving failed because the server rejected the request and the response was too long to fit on a single line of the toast.',
            )
         }
      >
         Long message
      </Button>
   ),
};
