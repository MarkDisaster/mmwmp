import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';

import { LanguageSelector } from '@/components/common/LanguageSelector';

type Language = 'cs' | 'en';

const AI_PREFIX = 'projects.form';

const meta: Meta<typeof LanguageSelector> = {
   title: 'Common/LanguageSelector',
   component: LanguageSelector,
   tags: ['autodocs'],
   args: {
      languages: ['cs'],
      activeLanguage: 'cs',
      onLanguageChange: fn(),
      onAddLanguage: fn(),
   },
   render: (args) => <Interactive {...args} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

const Interactive = (args: ComponentProps<typeof LanguageSelector>) => {
   const [languages, setLanguages] = useState<Language[]>(args.languages ?? ['cs']);
   const [active, setActive] = useState<Language>(args.activeLanguage ?? 'cs');

   return (
      <LanguageSelector
         {...args}
         languages={languages}
         activeLanguage={active}
         onLanguageChange={setActive}
         onAddLanguage={(language) => {
            setLanguages((prev) => [...prev, language]);
            setActive(language);
         }}
         onRemoveLanguage={(language) => {
            setLanguages((prev) => prev.filter((l) => l !== language));
            setActive('cs');
         }}
      />
   );
};

export const Default: Story = {};

export const AllLanguages: Story = {
   args: { languages: ['cs', 'en'], activeLanguage: 'en' },
};

export const WithRemovableLanguage: Story = {
   args: { languages: ['cs', 'en'], removableLanguages: ['en'] },
};

export const WithAI: Story = {
   args: { canGenerateAI: true, aiFormPrefix: AI_PREFIX, onGenerateLanguage: fn() },
};

export const AIUnavailable: Story = {
   args: {
      canGenerateAI: false,
      aiFormPrefix: AI_PREFIX,
      onGenerateLanguage: fn(),
   },
};

export const Generating: Story = {
   args: {
      languages: ['cs'],
      canGenerateAI: true,
      aiFormPrefix: AI_PREFIX,
      onGenerateLanguage: fn(),
      generatingLanguage: 'en',
   },
};

export const Disabled: Story = {
   args: { languages: ['cs', 'en'], removableLanguages: ['en'], disabled: true },
};
