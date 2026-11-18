import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { TagService } from '../tag.service';
import { tagNameInputSchema, toToolTag } from './tag-tool-output';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the tag to update.'),
   currentName: z
      .string()
      .min(1)
      .describe(
         'The CURRENT Czech name of the tag, exactly as `findTags` / `getTag` returned it (`name`). ' +
            'The approval tile shows it so the user sees which tag changes; a mismatch changes nothing.',
      ),
   translations: z
      .array(tagNameInputSchema)
      .max(2)
      .refine((names) => new Set(names.map((n) => n.language)).size === names.length, {
         message: 'Each language may be listed once.',
      })
      .optional()
      .describe(
         'Names to set: a language you list gets that name (a new `en` name is added, an existing ' +
            'name is changed); a language you do not list stays as it is.',
      ),
   removeLanguages: z
      .array(z.literal('en'))
      .max(1)
      .optional()
      .describe(
         'Pass `["en"]` to remove the English name (the website then shows the Czech one). The ' +
            'Czech name is required and cannot be removed. Do not combine with an `en` entry in `translations`.',
      ),
   slug: z
      .string()
      .regex(SLUG_REGEX, `${SLUG_MESSAGE}.`)
      .optional()
      .describe(
         'New URL-friendly identifier shared by all languages. Must stay unique among tags. Omit to keep the current one.',
      ),
   color: z
      .string()
      .optional()
      .describe('New CSS colour (hex or named). Omit to keep the current one.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'updateTag',
   description:
      'Update an existing tag. Pass only what you want to change; omitted fields stay as they are. ' +
      'Names are per language in `translations` (`cs` Czech, `en` English): list a language to set or add its name, ' +
      'and use `removeLanguages: ["en"]` to remove the English name; the Czech name cannot be removed. ' +
      'Slug changes are checked for conflicts with other tags. ' +
      'Find the id and `currentName` with `findTags` / `getTag` first. ' +
      'Needs approval: the SDK pauses execution and renders an approval tile with the change — just call the tool.',
   inputSchema,
   permission: { resource: PermissionResource.tags, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   editTarget: ({ id }) => [{ entity: EditLockEntity.tags, id }],
   audit: { action: 'tag.update', resourceType: 'tag' },
})
@Injectable()
export class UpdateTagTool extends AiToolHandler<Input> {
   constructor(private readonly tagService: TagService) {
      super();
   }

   async execute(
      _ctx: ToolContext,
      { id, currentName, translations, removeLanguages, slug, color }: Input,
   ) {
      try {
         const tag = await this.tagService.update(
            id,
            { translations, slug, color },
            { removeLanguages: removeLanguages ?? [], expectedName: currentName },
         );
         return toToolTag(tag);
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Tag with id ${id} not found.`);
         }
         throw error;
      }
   }
}
