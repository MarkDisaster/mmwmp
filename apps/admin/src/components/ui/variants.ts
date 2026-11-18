import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
   'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3',
   {
      variants: {
         variant: {
            default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
            secondary: 'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
            destructive:
               'bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90',
            outline:
               'border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
            ghost: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
            link: 'text-primary underline-offset-4 [a&]:hover:underline',
         },
      },
      defaultVariants: {
         variant: 'default',
      },
   },
);

export const buttonVariants = cva(
   "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
   {
      variants: {
         variant: {
            default: 'bg-primary text-primary-foreground hover:bg-primary/90',
            destructive:
               'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
            outline:
               'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
            secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
            link: 'text-primary underline-offset-4 hover:underline',
         },
         size: {
            default: 'h-9 px-4 py-2 has-[>svg]:px-3',
            xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
            sm: 'h-7 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
            lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
            icon: 'size-9',
            'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
            'icon-sm': 'size-8',
            'icon-lg': 'size-10',
         },
      },
      defaultVariants: {
         variant: 'default',
         size: 'default',
      },
   },
);

export const toggleVariants = cva(
   "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
   {
      variants: {
         variant: {
            default: 'bg-transparent',
            outline:
               'border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground',
         },
         size: {
            default: 'h-9 min-w-9 px-2',
            sm: 'h-8 min-w-8 px-1.5',
            lg: 'h-10 min-w-10 px-2.5',
         },
      },
      defaultVariants: {
         variant: 'default',
         size: 'default',
      },
   },
);

export const dialogClasses = {
   overlay:
      'fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
   content:
      'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-white p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg',
   close: "ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
   title: 'text-lg leading-none font-semibold',
   description: 'text-sm text-muted-foreground',
};
