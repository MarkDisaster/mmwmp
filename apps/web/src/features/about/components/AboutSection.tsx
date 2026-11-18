import { cn } from '@mm/utils/cn';
import { useLocale, useTranslations } from 'next-intl';

import type { PublicServiceEntity } from '@/api/generated/models/PublicServiceEntity';
import type { PublicTagEntity } from '@/api/generated/models/PublicTagEntity';
import { Badge } from '@/components/common/Badge';
import { RichText } from '@/components/common/rich-text/RichText';
import { Link } from '@/i18n/navigation';
import { getTagName } from '@/utils/getTagName';
import { getTranslation } from '@/utils/getTranslation';

import { ServiceCard } from './ServiceCard';

type AboutSectionProps = {
   title?: string | null;
   description: string | null;
   services: PublicServiceEntity[];
   tags?: PublicTagEntity[];
   variant?: 'preview' | 'detail';
};

export function AboutSection({
   title,
   description,
   services,
   tags,
   variant = 'detail',
}: AboutSectionProps) {
   const t = useTranslations('Services');
   const locale = useLocale();
   const heading = title || t('aboutTitle');

   const tagNames = (tags ?? [])
      .map((tag) => ({ id: tag.id, name: getTagName(tag, locale) }))
      .filter((tag) => tag.name !== '');
   const shownServices = services.filter((service) => getTranslation(service, locale));

   if (!description && shownServices.length === 0 && tagNames.length === 0) return null;

   return (
      <section id="about" className="relative z-10 mb-40 w-full scroll-mt-37.5 px-6.25">
         {variant === 'detail' ? (
            <h1 className="mb-15 wrap-anywhere md:max-w-[70%]">{heading}</h1>
         ) : (
            <Link href="/about" className="block text-foreground no-underline hover:no-underline">
               <h2 className="mb-15 text-title leading-[3rem] wrap-anywhere md:max-w-[70%] md:text-display md:leading-[5rem]">
                  {heading}
               </h2>
            </Link>
         )}

         {description && (
            <RichText
               html={description}
               className={cn(
                  'w-full md:w-[60%]',
                  variant === 'preview' ? 'mb-16' : 'mb-32 md:mb-42',
               )}
            />
         )}

         {variant === 'preview' && tagNames.length > 0 && (
            <div className="mb-32 flex flex-wrap content-start gap-2 md:mb-42 md:w-[60%]">
               {tagNames.map((tag) => (
                  <Badge key={tag.id}>{tag.name}</Badge>
               ))}
            </div>
         )}

         <div
            className={cn(
               'grid grid-cols-1 gap-y-12.5 md:gap-y-36',
               variant === 'preview' ? 'gap-x-16 md:grid-cols-3' : 'gap-x-26 md:grid-cols-2',
            )}
         >
            {shownServices.map((service) =>
               variant === 'preview' ? (
                  <Link
                     key={service.id}
                     href={`/about#${service.slug}`}
                     className="group h-full text-foreground hover:text-foreground hover:no-underline md:max-w-100"
                  >
                     <ServiceCard service={service} variant="preview" />
                  </Link>
               ) : (
                  <div key={service.id} className="h-full">
                     <ServiceCard service={service} variant="detail" />
                  </div>
               ),
            )}
            {variant === 'detail' && tagNames.length > 0 && (
               <div className="flex flex-wrap content-start gap-2">
                  {tagNames.map((tag) => (
                     <Badge key={tag.id}>{tag.name}</Badge>
                  ))}
               </div>
            )}
         </div>
      </section>
   );
}
