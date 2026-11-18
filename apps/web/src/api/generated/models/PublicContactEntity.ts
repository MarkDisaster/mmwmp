/* eslint-disable */

import type { ContactTranslationEntity } from './ContactTranslationEntity';

export type PublicContactEntity = {
   id: number;
   companyName?: string | null;
   phone?: string | null;
   email?: string | null;
   street?: string | null;
   zip?: string | null;
   city?: string | null;
   ico?: string | null;
   vatPayer: boolean;
   linkedinUrl?: string | null;
   githubUrl?: string | null;
   translations: ContactTranslationEntity[];
   createdAt: string;
   updatedAt: string;
};
