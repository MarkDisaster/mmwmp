import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { RICH_TEXT_HTML_HINT } from '@/common/sanitize/sanitize-rich-text';
import { httpUrlSchema } from '@/common/schema/http-url.schema';
import { CONTACT_LOCK_ID } from '@/edit-lock/edit-lock.constants';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { MAX_ABOUT_TITLE_LENGTH } from '../contact.constants';
import { ContactService } from '../contact.service';
import type { UpsertContactDto } from '../dto/upsert-contact.dto';

const inputSchema = z.object({
   companyName: z
      .string()
      .nullable()
      .optional()
      .describe('Company name. Omit to keep current, `null` to clear.'),
   phone: z
      .string()
      .nullable()
      .optional()
      .describe('Phone number. Omit to keep current, `null` to clear.'),
   email: z
      .string()
      .email()
      .nullable()
      .optional()
      .describe('Email address. Omit to keep current, `null` to clear.'),
   street: z
      .string()
      .nullable()
      .optional()
      .describe('Street address. Omit to keep current, `null` to clear.'),
   zip: z
      .string()
      .nullable()
      .optional()
      .describe('ZIP / postal code. Omit to keep current, `null` to clear.'),
   city: z.string().nullable().optional().describe('City. Omit to keep current, `null` to clear.'),
   ico: z
      .string()
      .nullable()
      .optional()
      .describe('Company registration number (IČO). Omit to keep current, `null` to clear.'),
   vatPayer: z.boolean().optional().describe('VAT payer flag. Omit to keep current.'),
   linkedinUrl: httpUrlSchema
      .nullable()
      .optional()
      .describe('LinkedIn profile URL. Omit to keep current, `null` to clear.'),
   githubUrl: httpUrlSchema
      .nullable()
      .optional()
      .describe('GitHub profile URL. Omit to keep current, `null` to clear.'),
   descriptionCs: z
      .string()
      .nullable()
      .optional()
      .describe(
         `Czech about-me description (rich HTML, sanitised server-side). ${RICH_TEXT_HTML_HINT} ` +
            'Omit to keep current CS translation, `null` to clear it.',
      ),
   descriptionEn: z
      .string()
      .nullable()
      .optional()
      .describe(
         `English about-me description (rich HTML, sanitised server-side). ${RICH_TEXT_HTML_HINT} ` +
            'Omit to keep current EN translation, `null` to clear it.',
      ),
   aboutTitleCs: z
      .string()
      .trim()
      .max(MAX_ABOUT_TITLE_LENGTH)
      .nullable()
      .optional()
      .describe(
         `Czech heading of the About section, plain text, max ${MAX_ABOUT_TITLE_LENGTH} characters. ` +
            'Public. Omit to keep current, `null` or empty to clear it (the web then uses its default title).',
      ),
   aboutTitleEn: z
      .string()
      .trim()
      .max(MAX_ABOUT_TITLE_LENGTH)
      .nullable()
      .optional()
      .describe(
         `English heading of the About section, plain text, max ${MAX_ABOUT_TITLE_LENGTH} characters. ` +
            'Public. Omit to keep current, `null` or empty to clear it (the web then uses its default title).',
      ),
});
type Input = z.infer<typeof inputSchema>;
type Translation = NonNullable<UpsertContactDto['translations']>[number];

function buildTranslation(
   language: Language,
   description: string | null | undefined,
   aboutTitle: string | null | undefined,
): Translation | null {
   if (description === undefined && aboutTitle === undefined) return null;
   return {
      language,
      ...(description !== undefined && { description }),
      ...(aboutTitle !== undefined && { aboutTitle }),
   };
}

@AiTool({
   name: 'updateContact',
   description:
      'Update the singleton contact info (company, address, email, phone, social URLs, localized ' +
      'about-me heading and text). Pass only the fields you want to change — omitted fields stay as they are; ' +
      '`null` clears a field. Use `getContact` first to read the current state before suggesting ' +
      'changes, and confirm with the user before overwriting any existing value.',
   inputSchema,
   permission: { resource: PermissionResource.contact, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   editTarget: () => [{ entity: EditLockEntity.contact, id: CONTACT_LOCK_ID }],
   audit: { action: 'contact.upsert', resourceType: 'contact' },
})
@Injectable()
export class UpdateContactTool extends AiToolHandler<Input> {
   constructor(private readonly contactService: ContactService) {
      super();
   }

   async execute(_ctx: ToolContext, input: Input) {
      const partial: Partial<UpsertContactDto> = {};
      if (input.companyName !== undefined) partial.companyName = input.companyName;
      if (input.phone !== undefined) partial.phone = input.phone;
      if (input.email !== undefined) partial.email = input.email;
      if (input.street !== undefined) partial.street = input.street;
      if (input.zip !== undefined) partial.zip = input.zip;
      if (input.city !== undefined) partial.city = input.city;
      if (input.ico !== undefined) partial.ico = input.ico;
      if (input.vatPayer !== undefined) partial.vatPayer = input.vatPayer;
      if (input.linkedinUrl !== undefined) partial.linkedinUrl = input.linkedinUrl;
      if (input.githubUrl !== undefined) partial.githubUrl = input.githubUrl;

      const translations: Translation[] = [];
      const cs = buildTranslation(Language.cs, input.descriptionCs, input.aboutTitleCs);
      const en = buildTranslation(Language.en, input.descriptionEn, input.aboutTitleEn);
      if (cs) translations.push(cs);
      if (en) translations.push(en);
      if (translations.length > 0) {
         partial.translations = translations;
      }

      const result = await this.contactService.upsert(partial);
      return {
         companyName: result?.companyName,
         email: result?.email,
         phone: result?.phone,
         street: result?.street,
         zip: result?.zip,
         city: result?.city,
         ico: result?.ico,
         vatPayer: result?.vatPayer,
         linkedinUrl: result?.linkedinUrl,
         githubUrl: result?.githubUrl,
         translations: result?.translations.map((t) => ({
            language: t.language,
            description: t.description,
            aboutTitle: t.aboutTitle,
         })),
      };
   }
}
