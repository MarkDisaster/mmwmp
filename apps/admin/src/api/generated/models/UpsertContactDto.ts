/* eslint-disable */

import type { UpsertContactTranslationDto } from './UpsertContactTranslationDto';

export type UpsertContactDto = {
   companyName?: string | null;
   phone?: string | null;
   email?: string | null;
   street?: string | null;
   zip?: string | null;
   city?: string | null;
   ico?: string | null;
   vatPayer?: boolean;
   linkedinUrl?: string | null;
   githubUrl?: string | null;
   translations?: UpsertContactTranslationDto[];
   version?: number;
};
