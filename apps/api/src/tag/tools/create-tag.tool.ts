import { ConflictException, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { TagService } from '../tag.service';
import { tagNameInputSchema, toToolTag } from './tag-tool-output';

const inputSchema = z.object({
   slug: z
      .string()
      .regex(SLUG_REGEX, `${SLUG_MESSAGE}.`)
      .describe(
         'URL-friendly identifier shared by all languages, lowercase, hyphens for spaces (e.g. "react", "pripadova-studie"). Must be globally unique among tags.',
      ),
   translations: z
      .array(tagNameInputSchema)
      .min(1)
      .max(2)
      .refine((names) => names.some((n) => n.language === 'cs'), {
         message: 'The Czech (cs) name is required.',
      })
      .refine((names) => new Set(names.map((n) => n.language)).size === names.length, {
         message: 'Each language may be listed once.',
      })
      .describe(
         'Names of the tag: `cs` is REQUIRED, `en` is optional (the website shows the Czech name ' +
            'where a tag has no English one).',
      ),
   color: z
      .string()
      .optional()
      .describe(
         'Optional CSS colour — hex (`#1f6feb`) or named colour. Omit for the default chip styling.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'createTag',
   description:
      'Create a new tag in the admin database. Tags are reusable labels attached to projects. ' +
      'A tag has a language-independent `slug` and a name per language in `translations`: Czech (`cs`) is ' +
      'required, English (`en`) is optional — e.g. slug "pripadova-studie", cs "Případová studie", ' +
      'en "Case study". If the user gives only one name, ask for the other or create the tag with Czech only. ' +
      'The slug must be unique across all tags — the call fails with a conflict if a tag with the same slug already exists. ' +
      'Needs approval: the SDK pauses execution and renders an approval tile with the slug and the names — just call the tool, do not chat-ask for confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.tags, action: PermissionAction.create },
   behavior: 'mutating',
   needsApproval: true,
   audit: { action: 'tag.create', resourceType: 'tag' },
})
@Injectable()
export class CreateTagTool extends AiToolHandler<Input> {
   constructor(private readonly tagService: TagService) {
      super();
   }

   async execute(_ctx: ToolContext, { slug, translations, color }: Input) {
      try {
         const tag = await this.tagService.create({ slug, translations, color });
         return toToolTag(tag);
      } catch (error) {
         if (error instanceof ConflictException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
