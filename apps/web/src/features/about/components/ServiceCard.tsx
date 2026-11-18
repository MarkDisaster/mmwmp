import { cn } from '@mm/utils/cn';
import { useLocale } from 'next-intl';

import type { PublicServiceEntity } from '@/api/generated/models/PublicServiceEntity';
import { RichText } from '@/components/common/rich-text/RichText';
import { getTranslation } from '@/utils/getTranslation';

type ServiceCardProps = {
   service: PublicServiceEntity;
   variant: 'preview' | 'detail';
};

export function ServiceCard({ service, variant }: ServiceCardProps) {
   const locale = useLocale();
   const translation = getTranslation(service, locale);

   if (!translation) return null;

   return (
      <article id={service.slug} className="flex h-full scroll-mt-37.5 flex-col">
         <h2
            className={cn(
               variant === 'preview' &&
                  'transition-colors duration-400 group-hover:text-brand group-focus-visible:text-brand',
            )}
         >
            {translation.title}
         </h2>
         {variant === 'preview' && translation.description && (
            <div className="flex flex-col pt-12.5">
               <p className="font-normal whitespace-pre-line">{translation.description}</p>
            </div>
         )}
         {variant === 'detail' && translation.content && (
            <RichText html={translation.content} className="pt-12.5" />
         )}
      </article>
   );
}
