import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { BackLink } from '@/components/common/BackLink';
import { DetailPageGrid } from '@/components/layout/DetailPageGrid';
import { Link } from '@/i18n/navigation';

const REGULATOR_URL = 'https://uoou.gov.cz';

type ParagraphProps = {
   heading: string;
   children: ReactNode;
};

function Paragraph({ heading, children }: ParagraphProps) {
   return (
      <p>
         <strong>{heading}</strong> {children}
      </p>
   );
}

export function PrivacySection() {
   const t = useTranslations('Privacy');
   const tHeader = useTranslations('Header');

   const richTags = {
      contact: (chunks: ReactNode) => <Link href="/contact">{chunks}</Link>,
      uoou: (chunks: ReactNode) => <a href={REGULATOR_URL}>{chunks}</a>,
   };

   return (
      <section className="relative z-10 mb-75 w-full px-6.25">
         <BackLink href="/">{tHeader('backToHome')}</BackLink>

         <DetailPageGrid>
            <h1 className="wrap-anywhere lg:col-start-1">{t('title')}</h1>

            <div className="lg:col-start-1">
               <p className="pb-12.5 text-lg font-semibold">{t('lead')}</p>

               <div className="flex flex-col gap-6.25">
                  <Paragraph heading={t('whoHeading')}>{t.rich('whoText', richTags)}</Paragraph>
                  <Paragraph heading={t('noToolsHeading')}>{t('noToolsText')}</Paragraph>
                  <Paragraph heading={t('deviceHeading')}>{t('deviceIntro')}</Paragraph>
                  <ul className="list-disc space-y-2 pl-6.25 text-lg leading-[1.6rem]">
                     <li>{t('deviceStorage')}</li>
                     <li>{t('deviceCookie')}</li>
                  </ul>
                  <Paragraph heading={t('gameHeading')}>{t('gameText')}</Paragraph>
                  <Paragraph heading={t('ipHeading')}>{t('ipText')}</Paragraph>
                  <Paragraph heading={t('hostingHeading')}>{t('hostingText')}</Paragraph>
                  <Paragraph heading={t('monitoringHeading')}>{t('monitoringText')}</Paragraph>
                  <Paragraph heading={t('aiHeading')}>{t('aiText')}</Paragraph>
                  <Paragraph heading={t('contactHeading')}>{t('contactText')}</Paragraph>
                  <Paragraph heading={t('automatedHeading')}>{t('automatedText')}</Paragraph>
                  <Paragraph heading={t('rightsHeading')}>
                     {t.rich('rightsText', richTags)}
                  </Paragraph>
                  <Paragraph heading={t('changesHeading')}>{t('changesText')}</Paragraph>
               </div>
            </div>
         </DetailPageGrid>
      </section>
   );
}
