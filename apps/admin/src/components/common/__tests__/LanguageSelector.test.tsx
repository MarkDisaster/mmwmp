import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

import { LanguageSelector } from '../LanguageSelector';

type Language = 'cs' | 'en';

const noop = () => {};

const REMOVE_ENGLISH = 'Remove language English';

const StatefulSelector = () => {
   const [languages, setLanguages] = useState<Language[]>(['cs', 'en']);
   const [activeLanguage, setActiveLanguage] = useState<Language>('en');
   return (
      <LanguageSelector
         languages={languages}
         activeLanguage={languages.includes(activeLanguage) ? activeLanguage : languages[0]}
         onLanguageChange={setActiveLanguage}
         onAddLanguage={noop}
         removableLanguages={languages.filter((language) => language !== 'cs')}
         onRemoveLanguage={(language) =>
            setLanguages((current) => current.filter((item) => item !== language))
         }
      />
   );
};

describe('LanguageSelector', () => {
   it('should give the focus to the active tab after the remove button unmounted with its tab', async () => {
      const user = userEvent.setup();
      render(<StatefulSelector />, { wrapper: TooltipProvider });

      await user.click(screen.getByRole('button', { name: REMOVE_ENGLISH }));

      expect(screen.queryByRole('button', { name: REMOVE_ENGLISH })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Czech' })).toHaveFocus();
   });

   it('should lock adding, removing and generating languages but keep the tabs while disabled', async () => {
      const user = userEvent.setup();
      const onLanguageChange = vi.fn();
      render(
         <LanguageSelector
            languages={['cs', 'en']}
            activeLanguage="en"
            onLanguageChange={onLanguageChange}
            onAddLanguage={noop}
            removableLanguages={['en']}
            onRemoveLanguage={noop}
            onGenerateLanguage={noop}
            canGenerateAI
            aiFormPrefix="projects.form"
            disabled
         />,
         { wrapper: TooltipProvider },
      );

      expect(screen.getByRole('button', { name: REMOVE_ENGLISH })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Regenerate with AI' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Czech' }));
      expect(onLanguageChange).toHaveBeenCalledWith('cs');
   });

   it('should lock the button of a missing language while disabled', () => {
      render(
         <LanguageSelector
            languages={['cs']}
            activeLanguage="cs"
            onLanguageChange={noop}
            onAddLanguage={noop}
            disabled
         />,
         { wrapper: TooltipProvider },
      );

      expect(screen.getByRole('button', { name: 'English' })).toBeDisabled();
   });
});
