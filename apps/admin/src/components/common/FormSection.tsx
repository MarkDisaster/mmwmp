import type { ReactNode } from 'react';
import { useId } from 'react';

type FormSectionProps = {
   title: string;
   children: ReactNode;
};

export const FormSection = ({ title, children }: FormSectionProps) => {
   const titleId = useId();

   return (
      <section aria-labelledby={titleId} className="space-y-4">
         <h2
            id={titleId}
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
         >
            {title}
         </h2>
         {children}
      </section>
   );
};
