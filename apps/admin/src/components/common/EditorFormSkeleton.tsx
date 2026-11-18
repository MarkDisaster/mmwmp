import { cn } from '@mm/utils/cn';

import { Skeleton } from '@/components/ui/skeleton';

import { EDITOR_FORM_HEADER_CLASS, editorFormGridClass } from './editorFormLayoutClasses';

type SkeletonBlock =
   | 'input'
   | 'narrowInput'
   | 'pair'
   | 'responsivePair'
   | 'textarea'
   | 'editor'
   | 'translatedEditor'
   | 'media'
   | 'thumbnail'
   | 'links'
   | 'permissions'
   | 'checkbox'
   | 'button'
   | 'avatar';

const PERMISSION_ROWS = 7;

type EditorFormSkeletonProps = {
   headerButtons: number;
   stickyHeader?: boolean;
   toolbar?: boolean;
   main: SkeletonBlock[][];
   sidebar?: SkeletonBlock[][];
   sidebarAction?: boolean;
   mainAction?: boolean;
};

const Field = ({ control }: { control: string }) => (
   <div className="space-y-2">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className={control} />
   </div>
);

const Pair = ({ className }: { className: string }) => (
   <div className={cn('grid gap-4', className)}>
      <Field control="h-9 w-full" />
      <Field control="h-9 w-full" />
   </div>
);

const Block = ({ block }: { block: SkeletonBlock }) => {
   switch (block) {
      case 'input':
         return <Field control="h-9 w-full" />;
      case 'narrowInput':
         return (
            <div className="max-w-sm">
               <Field control="h-9 w-full" />
            </div>
         );
      case 'pair':
         return <Pair className="grid-cols-2" />;
      case 'responsivePair':
         return <Pair className="grid-cols-1 sm:grid-cols-2" />;
      case 'textarea':
         return <Field control="h-20 w-full" />;
      case 'editor':
         return <Field control="h-[275px] w-full" />;
      case 'translatedEditor':
         return (
            <div className="space-y-2">
               <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <div className="flex gap-2">
                     <Skeleton className="h-7 w-12" />
                     <Skeleton className="h-7 w-12" />
                  </div>
               </div>
               <Skeleton className="h-[275px] w-full" />
            </div>
         );
      case 'media':
         return <Field control="h-30 w-full" />;
      case 'thumbnail':
         return (
            <div className="space-y-2">
               <Skeleton className="h-3.5 w-24" />
               <div className="flex flex-wrap gap-4">
                  <Skeleton className="aspect-4/3 w-32 shrink-0 rounded-lg" />
                  <div className="min-w-36 flex-1 space-y-3">
                     <div className="space-y-1">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-20" />
                     </div>
                     <div className="flex gap-2">
                        <Skeleton className="h-7 w-20" />
                        <Skeleton className="h-7 w-20" />
                     </div>
                  </div>
               </div>
            </div>
         );
      case 'links':
         return (
            <div className="space-y-2 pb-2">
               <Skeleton className="h-3.5 w-24" />
               <div className="flex items-start gap-2">
                  <Skeleton className="size-9" />
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="size-9" />
               </div>
               <Skeleton className="h-7 w-24" />
            </div>
         );
      case 'permissions':
         return (
            <div>
               <div className="py-2">
                  <Skeleton className="h-5 w-full" />
               </div>
               {Array.from({ length: PERMISSION_ROWS }).map((_, index) => (
                  <div key={index} className="border-t py-3">
                     <Skeleton className="h-5 w-full" />
                  </div>
               ))}
            </div>
         );
      case 'checkbox':
         return <Skeleton className="h-4 w-40" />;
      case 'button':
         return <Skeleton className="h-9 w-24" />;
      case 'avatar':
         return (
            <div className="flex items-center gap-4">
               <Skeleton className="size-20 rounded-full" />
               <Skeleton className="h-7 w-24" />
            </div>
         );
   }
};

const Sections = ({ sections }: { sections: SkeletonBlock[][] }) => (
   <>
      {sections.map((blocks, sectionIndex) => (
         <section key={sectionIndex} className="space-y-4">
            <Skeleton className="h-4 w-20" />
            {blocks.map((block, blockIndex) => (
               <Block key={blockIndex} block={block} />
            ))}
         </section>
      ))}
   </>
);

export const EditorFormSkeleton = ({
   headerButtons,
   stickyHeader = true,
   toolbar,
   main,
   sidebar,
   sidebarAction,
   mainAction,
}: EditorFormSkeletonProps) => (
   <div className="@container space-y-6" aria-busy="true">
      <div className={stickyHeader ? EDITOR_FORM_HEADER_CLASS : 'py-3'}>
         <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Skeleton className="mr-auto h-8 w-48" />
            {headerButtons > 0 && (
               <div className="flex gap-2">
                  {Array.from({ length: headerButtons }).map((_, index) => (
                     <Skeleton key={index} className="h-9 w-24" />
                  ))}
               </div>
            )}
         </div>
      </div>
      {toolbar && (
         <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-7 w-12" />
         </div>
      )}
      <div className={editorFormGridClass(!!sidebar)}>
         <div className="min-w-0 space-y-10">
            <Sections sections={main} />
            {mainAction && <Skeleton className="h-9 w-32" />}
         </div>
         {sidebar && (
            <div className="min-w-0 space-y-10">
               <Sections sections={sidebar} />
               {sidebarAction && <Skeleton className="h-9 w-32" />}
            </div>
         )}
      </div>
   </div>
);
