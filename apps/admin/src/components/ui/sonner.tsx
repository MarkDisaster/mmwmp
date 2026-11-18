import {
   CircleCheckIcon,
   InfoIcon,
   Loader2Icon,
   OctagonXIcon,
   TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
   return (
      <Sonner
         className="toaster group"
         richColors
         icons={{
            success: <CircleCheckIcon className="size-4" />,
            info: <InfoIcon className="size-4" />,
            warning: <TriangleAlertIcon className="size-4" />,
            error: <OctagonXIcon className="size-4" />,
            loading: <Loader2Icon className="size-4 animate-spin" />,
         }}
         toastOptions={{
            style: {
               borderRadius: '8px',
               fontSize: '14px',
               fontWeight: 500,
            },
            classNames: {
               success: 'bg-green-50! text-green-800! border-green-200!',
               error: 'bg-red-50! text-red-800! border-red-200!',
               info: 'bg-blue-50! text-blue-800! border-blue-200!',
               warning: 'bg-amber-50! text-amber-800! border-amber-200!',
            },
         }}
         {...props}
      />
   );
};

export { Toaster };
