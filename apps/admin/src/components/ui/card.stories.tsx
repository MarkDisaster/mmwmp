import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import {
   Card,
   CardAction,
   CardContent,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle,
} from './card';

const meta = {
   title: 'UI/Card',
   component: Card,
   tags: ['autodocs'],
   parameters: { layout: 'centered' },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
   render: () => (
      <Card className="w-96">
         <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Manage your account preferences</CardDescription>
         </CardHeader>
         <CardContent>
            <p className="text-sm text-muted-foreground">
               Configure notifications, theme, language.
            </p>
         </CardContent>
         <CardFooter>
            <Button variant="outline">Cancel</Button>
            <Button className="ml-2">Save</Button>
         </CardFooter>
      </Card>
   ),
};

export const WithAction: Story = {
   render: () => (
      <Card className="w-96">
         <CardHeader>
            <CardTitle>Project: marek.media</CardTitle>
            <CardDescription>Personal portfolio site</CardDescription>
            <CardAction>
               <Button variant="ghost" size="sm">
                  Edit
               </Button>
            </CardAction>
         </CardHeader>
         <CardContent>
            <p className="text-sm text-muted-foreground">Status: published · Updated 2 days ago</p>
         </CardContent>
      </Card>
   ),
};
