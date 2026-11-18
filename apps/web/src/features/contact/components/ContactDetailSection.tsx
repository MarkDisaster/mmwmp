import { cn } from '@mm/utils/cn';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { getTranslations } from 'next-intl/server';

import type { PublicContactEntity } from '@/api/generated/models/PublicContactEntity';
import GithubIconSVG from '@/assets/icons/github.svg';
import LinkedinIconSVG from '@/assets/icons/linkedin.svg';
import { SectionHeader } from '@/components/common/SectionHeader';

type ContactDetailSectionProps = {
   contact: PublicContactEntity;
};

export async function ContactDetailSection({ contact }: ContactDetailSectionProps) {
   const t = await getTranslations('Contact');
   const parsedPhone = contact.phone ? parsePhoneNumberFromString(contact.phone, 'CZ') : null;
   const phoneUri = parsedPhone?.getURI();
   const phoneFormatted = parsedPhone?.formatInternational();
   const zipCity = [contact.zip, contact.city].filter(Boolean).join(' ');

   const linkClass =
      'duration-400 hover:text-brand text-foreground no-underline transition-colors hover:no-underline';

   return (
      <section id="contact" className="mb-40 w-full px-6.25">
         <SectionHeader href="/contact" title={t('title')} isPageTitle />
         {contact.email && (
            <p className="font-heading text-heading leading-normal font-semibold md:text-contact">
               <a
                  href={`mailto:${contact.email}`}
                  className={cn('text-heading md:text-contact', linkClass)}
               >
                  {contact.email}
               </a>
            </p>
         )}

         {parsedPhone && (
            <p className="font-heading text-heading leading-normal font-semibold md:text-contact">
               <a href={phoneUri} className={cn('text-heading md:text-contact', linkClass)}>
                  {phoneFormatted}
               </a>
            </p>
         )}

         <div className="mt-20 flex flex-col gap-10 text-lg md:flex-row md:items-start md:gap-30 md:*:border-l-4 md:*:border-border md:*:pl-7">
            {contact.companyName && <div>{contact.companyName}</div>}

            {(contact.street || contact.zip || contact.city) && (
               <div>
                  {contact.street && <div>{contact.street}</div>}
                  {zipCity && <div>{zipCity}</div>}
               </div>
            )}

            {contact.ico && (
               <div>
                  <div className="flex items-start gap-2">
                     <div>{t('ico')}:</div>
                     <div>{contact.ico}</div>
                  </div>
                  {!contact.vatPayer && <div>{t('notVatPayer')}</div>}
               </div>
            )}
         </div>
         <div className="mt-6 flex items-center gap-8">
            {contact.githubUrl && (
               <a
                  href={contact.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className={linkClass}
               >
                  <GithubIconSVG className="h-6 w-6" />
               </a>
            )}
            {contact.linkedinUrl && (
               <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className={linkClass}
               >
                  <LinkedinIconSVG className="h-6 w-6" />
               </a>
            )}
         </div>
      </section>
   );
}
