import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { ContactEntity } from '@/api/generated';
import { EditLockBanner } from '@/components/common/EditLockBanner';
import { EditorFormLayout } from '@/components/common/EditorFormLayout';
import { EditorFormSkeleton } from '@/components/common/EditorFormSkeleton';
import { FormSection } from '@/components/common/FormSection';
import { GroupLabel } from '@/components/common/GroupLabel';
import { NewerVersionNotice } from '@/components/common/NewerVersionNotice';
import { PageHeader } from '@/components/common/PageHeader';
import { ReadOnlyNotice } from '@/components/common/ReadOnlyNotice';
import { VersionConflictDialog } from '@/components/common/VersionConflictDialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { ABOUT_TITLE_MAX_LENGTH } from '@/features/contact/constants';
import {
   type ContactFormInput,
   type ContactFormValues,
   upsertContactSchema,
} from '@/features/contact/validation/contactSchema';
import { TextEditor } from '@/features/editor/components/TextEditor';
import { FormCheckbox } from '@/features/form/components/FormCheckbox';
import { FormInput } from '@/features/form/components/FormInput';
import { FormPhone } from '@/features/form/components/FormPhone';
import { usePermission } from '@/hooks/usePermission';
import { useRecordVersion } from '@/hooks/useRecordVersion';
import { useVersionConflictDialog } from '@/hooks/useVersionConflictDialog';
import { SUPPORTED_LANGUAGES } from '@/i18n/constants';
import { CONTACT_LOCK_ID } from '@/utils/editLock';
import { isVersionConflict } from '@/utils/httpError';
import { queryClient } from '@/utils/query-client';

type Lang = (typeof SUPPORTED_LANGUAGES)[number];

const toContactFormValues = (contact: ContactEntity | undefined): ContactFormInput => ({
   companyName: contact?.companyName ?? null,
   phone: contact?.phone ?? null,
   email: contact?.email ?? null,
   street: contact?.street ?? null,
   zip: contact?.zip ?? null,
   city: contact?.city ?? null,
   ico: contact?.ico ?? null,
   vatPayer: contact?.vatPayer ?? false,
   linkedinUrl: contact?.linkedinUrl ?? null,
   githubUrl: contact?.githubUrl ?? null,
   translations: SUPPORTED_LANGUAGES.map((language) => {
      const translation = contact?.translations?.find((tr) => tr.language === language);
      return {
         language,
         description: translation?.description ?? null,
         aboutTitle: translation?.aboutTitle ?? null,
      };
   }),
});

export const ContactPage = () => {
   const { t } = useTranslation();
   const descriptionLabelId = useId();
   const { data: contact, isLoading } = useQuery(api.contact.queries.detail);
   const upsert = useMutation(api.contact.mutations.upsert);
   const [activeLanguage, setActiveLanguage] = useState<Lang>('cs');
   const readOnly = !usePermission('contact', 'update');
   const methods = useForm<ContactFormInput, unknown, ContactFormValues>({
      resolver: zodResolver(upsertContactSchema),
      values: toContactFormValues(contact),
      resetOptions: { keepDirtyValues: true, keepDirty: true, keepErrors: true, keepTouched: true },
   });
   const recordVersion = useRecordVersion(contact, methods.formState.isDirty);
   const conflict = useVersionConflictDialog(async () => {
      const current = await queryClient.fetchQuery({
         ...api.contact.queries.detail,
         staleTime: 0,
      });
      methods.reset(toContactFormValues(current));
      recordVersion.adopt(current);
   });

   const activeIndex = SUPPORTED_LANGUAGES.indexOf(activeLanguage);
   const activeDescription = methods.watch(`translations.${activeIndex}.description`) ?? '';

   const handleSave = (data: ContactFormValues) => {
      upsert.mutate(
         {
            data: {
               ...data,
               linkedinUrl: data.linkedinUrl?.trim() ?? null,
               githubUrl: data.githubUrl?.trim() ?? null,
               version: recordVersion.version,
            },
         },
         {
            onSuccess: (saved) => {
               toast.success(t('contact.toast.saved'));
               methods.reset(toContactFormValues(saved));
               recordVersion.adopt(saved);
            },
            onError: (error) => {
               if (isVersionConflict(error)) conflict.show();
            },
         },
      );
   };

   if (isLoading)
      return (
         <EditorFormSkeleton
            headerButtons={1}
            main={[['translatedEditor']]}
            sidebar={[
               ['input', 'input'],
               ['input', 'input', 'pair', 'input', 'checkbox'],
               ['input', 'input'],
            ]}
         />
      );

   return (
      <Form {...methods}>
         <VersionConflictDialog {...conflict.dialogProps} />
         <EditorFormLayout
            formId="contact-form"
            onSubmit={methods.handleSubmit(handleSave)}
            notice={
               <>
                  {readOnly && <ReadOnlyNotice message={t('common.readOnly.permission')} />}
                  <EditLockBanner entity="contact" id={CONTACT_LOCK_ID} readOnly={readOnly} />
                  <NewerVersionNotice
                     visible={recordVersion.hasNewer && !readOnly}
                     onReload={() => void conflict.reload()}
                     isReloading={conflict.dialogProps.isReloading}
                  />
               </>
            }
            header={
               <PageHeader
                  title={t('contact.title')}
                  actions={
                     !readOnly && (
                        <Button type="submit" form="contact-form" disabled={upsert.isPending}>
                           {upsert.isPending ? t('common.loading') : t('common.save')}
                        </Button>
                     )
                  }
               />
            }
            sidebar={
               <fieldset disabled={readOnly} className="min-w-0 space-y-10">
                  <FormSection title={t('contact.sections.contact')}>
                     <FormInput
                        name="email"
                        label={t('contact.email')}
                        placeholder={t('contact.placeholder.email')}
                     />
                     <FormPhone
                        name="phone"
                        label={t('contact.phone')}
                        placeholder={t('contact.placeholder.phone')}
                     />
                  </FormSection>

                  <FormSection title={t('contact.sections.company')}>
                     <FormInput
                        name="companyName"
                        label={t('contact.companyName')}
                        placeholder={t('contact.placeholder.companyName')}
                     />
                     <FormInput
                        name="street"
                        label={t('contact.street')}
                        placeholder={t('contact.placeholder.street')}
                     />
                     <div className="grid grid-cols-2 gap-4">
                        <FormInput
                           name="zip"
                           label={t('contact.zip')}
                           placeholder={t('contact.placeholder.zip')}
                        />
                        <FormInput
                           name="city"
                           label={t('contact.city')}
                           placeholder={t('contact.placeholder.city')}
                        />
                     </div>
                     <FormInput
                        name="ico"
                        label={t('contact.ico')}
                        placeholder={t('contact.placeholder.ico')}
                     />
                     <FormCheckbox name="vatPayer" label={t('contact.vatPayer')} />
                  </FormSection>

                  <FormSection title={t('contact.sections.social')}>
                     <FormInput
                        name="githubUrl"
                        label={t('contact.githubUrl')}
                        placeholder={t('contact.placeholder.githubUrl')}
                     />
                     <FormInput
                        name="linkedinUrl"
                        label={t('contact.linkedinUrl')}
                        placeholder={t('contact.placeholder.linkedinUrl')}
                     />
                  </FormSection>
               </fieldset>
            }
         >
            <FormSection title={t('contact.sections.intro')}>
               <div className="space-y-4">
                  <div className="flex justify-end gap-2">
                     {SUPPORTED_LANGUAGES.map((lang) => (
                        <Button
                           key={lang}
                           type="button"
                           variant={lang === activeLanguage ? 'default' : 'outline'}
                           size="sm"
                           onClick={() => setActiveLanguage(lang)}
                        >
                           {t(`common.language.${lang}`)}
                        </Button>
                     ))}
                  </div>
                  <fieldset disabled={readOnly} className="min-w-0 space-y-2">
                     <FormInput
                        key={activeLanguage}
                        name={`translations.${activeIndex}.aboutTitle`}
                        label={t('contact.aboutTitle')}
                        maxLength={ABOUT_TITLE_MAX_LENGTH}
                        description={t('contact.aboutTitleHint')}
                     />
                  </fieldset>
                  <GroupLabel id={descriptionLabelId}>{t('contact.description')}</GroupLabel>
                  <fieldset disabled={readOnly} className="contents">
                     <TextEditor
                        labelledBy={descriptionLabelId}
                        key={activeLanguage}
                        content={activeDescription}
                        onChange={(html) =>
                           methods.setValue(`translations.${activeIndex}.description`, html, {
                              shouldDirty: true,
                           })
                        }
                        placeholder={t('contact.placeholder.description')}
                        disabled={readOnly}
                     />
                  </fieldset>
               </div>
            </FormSection>
         </EditorFormLayout>
      </Form>
   );
};
