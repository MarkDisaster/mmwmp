import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { MAX_ALT_TEXT_LENGTH, MAX_DISPLAY_NAME_LENGTH } from '../file.constants';
import { FileService } from '../file.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the file.'),
   displayName: z
      .string()
      .trim()
      .min(1)
      .max(MAX_DISPLAY_NAME_LENGTH)
      .nullable()
      .optional()
      .describe(
         `Human-readable name shown in the admin UI, at most ${MAX_DISPLAY_NAME_LENGTH} characters. ` +
            '`null` clears it.',
      ),
   altText: z
      .string()
      .max(MAX_ALT_TEXT_LENGTH)
      .nullable()
      .optional()
      .describe(
         'Alt text of the image: what it shows, in the language of the file, at most ' +
            `${MAX_ALT_TEXT_LENGTH} characters. Public (the web's \`alt\` attribute). \`null\` or empty clears it.`,
      ),
   language: z
      .enum([Language.cs, Language.en])
      .nullable()
      .optional()
      .describe(
         'Language association — useful for localized assets. `null` removes the association.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'updateFile',
   description:
      "Update a file's metadata — display name, alt text and/or language association. " +
      'Does NOT change the actual file content or storage path; only the admin-facing labels. ' +
      'Pass `null` to clear a field, omit it to leave it as is. ' +
      'Use `listFiles` first to find the id.',
   inputSchema,
   permission: { resource: PermissionResource.files, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   editTarget: ({ id }) => [{ entity: EditLockEntity.files, id }],
   audit: { action: 'file.update', resourceType: 'file' },
})
@Injectable()
export class UpdateFileTool extends AiToolHandler<Input> {
   constructor(private readonly fileService: FileService) {
      super();
   }

   async execute(ctx: ToolContext, { id, displayName, altText, language }: Input) {
      try {
         const file = await this.fileService.update(
            id,
            { displayName, language, altText },
            toSaveActor(ctx.user, PermissionResource.projects).canPublish,
         );
         return {
            id: file.id,
            filename: file.filename,
            displayName: file.displayName,
            altText: file.altText,
            language: file.language,
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`File with id ${id} not found.`);
         }
         throw error;
      }
   }
}
