import { Loader2, Plus, Sparkles, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SUPPORTED_LANGUAGES } from '@/i18n/constants';

type Language = (typeof SUPPORTED_LANGUAGES)[number];

type LanguageSelectorProps = {
   languages: Language[];
   activeLanguage: Language;
   onLanguageChange: (language: Language) => void;
   onAddLanguage: (language: Language) => void;
   removableLanguages?: Language[];
   onRemoveLanguage?: (language: Language) => void;
   onGenerateLanguage?: (language: Language) => void;
   canGenerateAI?: boolean;
   generatingLanguage?: Language;
   aiFormPrefix?: string;
   disabled?: boolean;
};

export const LanguageSelector = ({
   languages,
   activeLanguage,
   onLanguageChange,
   onAddLanguage,
   removableLanguages = [],
   onRemoveLanguage,
   onGenerateLanguage,
   canGenerateAI = false,
   generatingLanguage,
   aiFormPrefix,
   disabled = false,
}: LanguageSelectorProps) => {
   const { t } = useTranslation();
   const isGenerating = generatingLanguage !== undefined;
   const canGenerateNow = canGenerateAI && !isGenerating && !disabled;
   const tabRefs = useRef(new Map<Language, HTMLButtonElement>());
   const focusActiveTab = useRef(false);

   useEffect(() => {
      if (!focusActiveTab.current) return;
      focusActiveTab.current = false;
      tabRefs.current.get(activeLanguage)?.focus();
   }, [activeLanguage, languages]);

   const handleRemove = (language: Language) => {
      focusActiveTab.current = true;
      onRemoveLanguage?.(language);
   };

   const missingLanguages = SUPPORTED_LANGUAGES.filter((l) => !languages.includes(l));
   const showRegenerate =
      onGenerateLanguage && activeLanguage !== 'cs' && languages.includes(activeLanguage);

   return (
      <div className="flex items-center gap-2">
         {languages.map((lang) => {
            const removeLabel = t('common.removeLanguage', {
               language: t(`common.language.${lang}`),
            });
            return (
               <div key={lang} className="flex items-center">
                  <Button
                     ref={(element) => {
                        if (element) tabRefs.current.set(lang, element);
                        else tabRefs.current.delete(lang);
                     }}
                     type="button"
                     variant={lang === activeLanguage ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => onLanguageChange(lang)}
                  >
                     {t(`common.language.${lang}`)}
                  </Button>
                  {onRemoveLanguage && removableLanguages.includes(lang) && (
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label={removeLabel}
                              disabled={disabled}
                              onClick={() => handleRemove(lang)}
                           >
                              <X />
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent>{removeLabel}</TooltipContent>
                     </Tooltip>
                  )}
               </div>
            );
         })}
         {showRegenerate && aiFormPrefix && (
            <Button
               type="button"
               variant="ghost"
               size="sm"
               disabled={!canGenerateNow}
               title={!canGenerateAI ? t(`${aiFormPrefix}.generateAIHint`) : undefined}
               onClick={() => canGenerateNow && onGenerateLanguage?.(activeLanguage)}
            >
               {generatingLanguage === activeLanguage ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
               ) : (
                  <Sparkles className="mr-1 h-3 w-3" />
               )}
               {t(`${aiFormPrefix}.regenerateAI`)}
            </Button>
         )}
         {missingLanguages.map((lang) =>
            onGenerateLanguage && aiFormPrefix ? (
               <DropdownMenu key={lang}>
                  <DropdownMenuTrigger asChild>
                     <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isGenerating || disabled}
                     >
                        {generatingLanguage === lang ? (
                           <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                           <Plus className="mr-1 h-3 w-3" />
                        )}
                        {t(`common.language.${lang}`)}
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                     <DropdownMenuItem onClick={() => onAddLanguage(lang)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t(`${aiFormPrefix}.addManually`)}
                     </DropdownMenuItem>
                     <DropdownMenuItem
                        onClick={() => canGenerateNow && onGenerateLanguage(lang)}
                        disabled={!canGenerateNow}
                        title={!canGenerateAI ? t(`${aiFormPrefix}.generateAIHint`) : undefined}
                     >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t(`${aiFormPrefix}.generateAI`)}
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            ) : (
               <Button
                  key={lang}
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onAddLanguage(lang)}
               >
                  <Plus className="mr-1 h-3 w-3" />
                  {t(`common.language.${lang}`)}
               </Button>
            ),
         )}
      </div>
   );
};
