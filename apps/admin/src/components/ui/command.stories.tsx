import type { Meta, StoryObj } from '@storybook/react-vite';

import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from './command';

const meta = {
   title: 'UI/Command',
   component: Command,
   tags: ['autodocs'],
   decorators: [
      (Story) => (
         <div className="w-80 rounded-md border">
            <Story />
         </div>
      ),
   ],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
   render: () => (
      <Command>
         <CommandInput placeholder="Search projects..." />
         <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Projects">
               <CommandItem>Marek Media website</CommandItem>
               <CommandItem>Admin CMS</CommandItem>
               <CommandItem>Runner game</CommandItem>
            </CommandGroup>
            <CommandGroup heading="Services">
               <CommandItem>Web development</CommandItem>
               <CommandItem>Design systems</CommandItem>
            </CommandGroup>
         </CommandList>
      </Command>
   ),
};

export const WithDisabledItem: Story = {
   render: () => (
      <Command>
         <CommandInput placeholder="Search..." />
         <CommandList>
            <CommandGroup>
               <CommandItem>Available</CommandItem>
               <CommandItem disabled>Disabled</CommandItem>
            </CommandGroup>
         </CommandList>
      </Command>
   ),
};

export const Empty: Story = {
   render: () => (
      <Command>
         <CommandInput placeholder="Search..." defaultValue="zzz" />
         <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
               <CommandItem>Marek Media website</CommandItem>
            </CommandGroup>
         </CommandList>
      </Command>
   ),
};

export const LongList: Story = {
   render: () => (
      <Command>
         <CommandInput placeholder="Search..." />
         <CommandList>
            <CommandGroup heading="Items">
               {Array.from({ length: 30 }, (_, i) => (
                  <CommandItem key={i}>
                     Item {i + 1} with a rather long label that does not fit on one line at all
                  </CommandItem>
               ))}
            </CommandGroup>
         </CommandList>
      </Command>
   ),
};
