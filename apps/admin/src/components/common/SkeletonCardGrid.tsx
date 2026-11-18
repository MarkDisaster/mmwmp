import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CardGrid } from '@/features/layout/components/CardGrid';
import { PREVIEW_CARD_CLASS } from '@/utils/previewCard';

type SkeletonCardGridProps = {
   card: 'file' | 'project';
   count?: number;
};

const FileCardBody = () => (
   <div className="flex flex-col px-3 py-2">
      <Skeleton className="h-5 w-3/4" />
      <div className="flex h-8 items-center">
         <Skeleton className="h-4 w-1/2" />
      </div>
   </div>
);

const ProjectCardBody = () => (
   <div className="space-y-1.5 px-3 py-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5.5 w-1/2 rounded-full" />
      <Skeleton className="h-4 w-2/3" />
   </div>
);

const SkeletonCard = ({ card }: Pick<SkeletonCardGridProps, 'card'>) => (
   <Card className={PREVIEW_CARD_CLASS}>
      <Skeleton className="aspect-5/3 w-full rounded-none" />
      {card === 'file' ? <FileCardBody /> : <ProjectCardBody />}
   </Card>
);

export const SkeletonCardGrid = ({ card, count = 10 }: SkeletonCardGridProps) => (
   <CardGrid>
      {Array.from({ length: count }).map((_, i) => (
         <SkeletonCard key={i} card={card} />
      ))}
   </CardGrid>
);
