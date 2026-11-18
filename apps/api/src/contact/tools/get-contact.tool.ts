import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ContactService } from '../contact.service';

const inputSchema = z.object({});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'getContact',
   description:
      'Get the public contact info singleton (company, email, phone, address, social links, per-language about-me heading and description). Use when user asks about contact details displayed on the site.',
   inputSchema,
   permission: { resource: PermissionResource.contact, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class GetContactTool extends AiToolHandler<Input> {
   constructor(private readonly contactService: ContactService) {
      super();
   }

   async execute(_ctx: ToolContext, _input: Input) {
      const contact = await this.contactService.find();
      if (!contact) return null;
      return {
         companyName: contact.companyName,
         email: contact.email,
         phone: contact.phone,
         street: contact.street,
         zip: contact.zip,
         city: contact.city,
         ico: contact.ico,
         vatPayer: contact.vatPayer,
         linkedinUrl: contact.linkedinUrl,
         githubUrl: contact.githubUrl,
         translations: contact.translations.map((t) => ({
            language: t.language,
            aboutTitle: t.aboutTitle,
            description: t.description,
         })),
      };
   }
}
