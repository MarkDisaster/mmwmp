import type { ReactNode } from 'react';

type PageHeaderProps = {
   title: string;
   badge?: ReactNode;
   actions?: ReactNode;
};

export const PageHeader = ({ title, badge, actions }: PageHeaderProps) => (
   <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="mr-auto flex shrink-0 items-center gap-3">
         <h1 className="text-2xl font-semibold whitespace-nowrap">{title}</h1>
         {badge}
      </div>
      {actions}
   </div>
);
