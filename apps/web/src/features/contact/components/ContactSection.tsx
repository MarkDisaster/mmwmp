import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { getTranslations } from 'next-intl/server';

import type { PublicContactEntity } from '@/api/generated/models/PublicContactEntity';
import ArrowRightSvg from '@/assets/icons/arrow-right.svg';
import { Button } from '@/components/common/Button';
import { Link } from '@/i18n/navigation';

type ContactSectionProps = {
   contact: PublicContactEntity | null;
};

export async function ContactSection({ contact }: ContactSectionProps) {
   if (!contact) return null;

   const t = await getTranslations('Contact');
   const parsedPhone = contact.phone ? parsePhoneNumberFromString(contact.phone, 'CZ') : null;

   return (
      <section id="contact" className="relative z-10 mb-76.25 flex w-full items-center px-6.25">
         <div className="w-full px-25">
            <div className="flex flex-col items-center justify-between gap-6 text-center">
               <div className="flex flex-col gap-1.5">
                  {contact.email && (
                     <p className="font-heading text-heading leading-normal font-semibold md:text-title">
                        <a
                           href={`mailto:${contact.email}`}
                           className="text-foreground no-underline transition-colors duration-400 hover:text-brand hover:no-underline"
                        >
                           {contact.email}
                        </a>
                     </p>
                  )}
                  {parsedPhone && (
                     <p className="font-heading text-heading leading-normal font-semibold md:text-title">
                        <a
                           href={parsedPhone.getURI()}
                           className="text-foreground no-underline transition-colors duration-400 hover:text-brand hover:no-underline"
                        >
                           {parsedPhone.formatInternational()}
                        </a>
                     </p>
                  )}
               </div>

               <Button asChild className="gap-3">
                  <Link href="/contact">
                     {t('cta')}
                     <ArrowRightSvg className="w-5" />
                  </Link>
               </Button>
            </div>
         </div>
      </section>
   );
}
