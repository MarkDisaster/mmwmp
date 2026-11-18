import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import type { SlugAutofill } from '@/hooks/useSlugAutofill';

import { EditorSeoSection } from '../EditorSeoSection';

const slug: SlugAutofill = {
   isLocked: false,
   toggleLock: vi.fn(),
   markManual: vi.fn(),
   fillFromTitle: vi.fn(),
};

const EditorForm = ({ children }: { children: ReactNode }) => {
   const methods = useForm({
      defaultValues: {
         slug: 'web',
         translations: [
            { metaTitle: 'Titulek', metaDescription: 'Popis' },
            { metaTitle: 'Title', metaDescription: 'Description' },
         ],
      },
   });
   return <FormProvider {...methods}>{children}</FormProvider>;
};

const renderSection = (i18nPrefix: 'projects' | 'services', translationIndex = 0) =>
   render(
      <EditorSeoSection i18nPrefix={i18nPrefix} translationIndex={translationIndex} slug={slug} />,
      {
         wrapper: EditorForm,
      },
   );

describe('EditorSeoSection', () => {
   it('should label the fields with the texts of the projects', () => {
      renderSection('projects');

      expect(screen.getByRole('region', { name: 'SEO' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Slug (unlocked)' })).toHaveValue('web');
      expect(screen.getByRole('textbox', { name: 'Meta title' })).toHaveValue('Titulek');
      expect(screen.getByRole('textbox', { name: 'Meta description' })).toHaveValue('Popis');
   });

   it('should label the fields with the texts of the services', () => {
      renderSection('services');

      expect(screen.getByRole('textbox', { name: 'SEO title' })).toHaveValue('Titulek');
      expect(screen.getByRole('textbox', { name: 'SEO description' })).toHaveValue('Popis');
   });

   it('should show the meta tags of the language being edited', () => {
      renderSection('projects', 1);

      expect(screen.getByRole('textbox', { name: 'Meta title' })).toHaveValue('Title');
      expect(screen.getByRole('textbox', { name: 'Meta description' })).toHaveValue('Description');
   });
});
