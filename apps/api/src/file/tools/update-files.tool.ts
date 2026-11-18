import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { ALT_TEXT_BATCH_MAX, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { MAX_ALT_TEXT_LENGTH, MAX_DISPLAY_NAME_LENGTH } from '../file.constants';
import { FileService } from '../file.service';

const itemSchema = z
   .object({
      id: z.number().int().positive().describe('Numeric id of the file, from `listFiles`.'),
      currentName: z
         .string()
         .describe(
            'The name the file has NOW, exactly as `listFiles` returned it: `displayName`, or ' +
               '`originalName` when it has none. It is shown to the user in the approval tile ' +
               '(old name → new name) and checked: a file renamed meanwhile is not touched.',
         ),
      displayName: z
         .string()
         .trim()
         .min(1)
         .max(MAX_DISPLAY_NAME_LENGTH)
         .nullable()
         .optional()
         .describe(
            `NEW display name, at most ${MAX_DISPLAY_NAME_LENGTH} characters. \`null\` clears it. ` +
               'Omit to keep.',
         ),
      language: z
         .enum([Language.cs, Language.en])
         .nullable()
         .optional()
         .describe('NEW language association. `null` removes it. Omit to keep.'),
      altText: z
         .string()
         .max(MAX_ALT_TEXT_LENGTH)
         .nullable()
         .optional()
         .describe(
            'NEW alt text of the image: what it shows, in the language of the file, at most ' +
               `${MAX_ALT_TEXT_LENGTH} characters. Public (the web's \`alt\` attribute). ` +
               '`null` or empty clears it. Omit to keep.',
         ),
   })
   .refine(
      (item) =>
         item.displayName !== undefined ||
         item.language !== undefined ||
         item.altText !== undefined,
      { message: 'Each file needs a new displayName, language or altText.' },
   );

const inputSchema = z.object({
   files: z
      .array(itemSchema)
      .min(1)
      .max(TOOL_LIST_MAX_LIMIT)
      .refine((files) => new Set(files.map(({ id }) => id)).size === files.length, {
         message: 'Each file may appear only once.',
      })
      .describe(
         `1 to ${TOOL_LIST_MAX_LIMIT} files, each with its new name, language and/or alt text.`,
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'updateFiles',
   description:
      'Rename, re-language or add alt text to MANY files at once, with ONE confirmation (use it for 2 or more ' +
      'files; `updateFile` for a single one). Typical: "z názvů všech souborů odstraň ' +
      '"screencapture-"": call `listFiles` (with `search`, `limit` 100, pages if `total` is ' +
      'larger), compute every new name yourself, then call this once per batch of up to ' +
      `${TOOL_LIST_MAX_LIMIT} files. Every item carries its \`currentName\` so the approval ` +
      'tile shows "old → new". All or nothing: if any file is missing, was renamed meanwhile ' +
      'or belongs to a published project the user may not edit, NOTHING is changed and ' +
      '`failed` lists each file with its reason (`applied: false`); fix those and call again. ' +
      'Alt texts for many images ("doplň alt texty"): see what each image shows with ' +
      '`viewFileImage` (batches of 4), then send the texts here in calls of at most ' +
      `${ALT_TEXT_BATCH_MAX} files: ` +
      'alt texts go public, so the user must be able to read them all in the approval tile ' +
      '(shown in full, the first 8 at once, the rest after "show all"). ' +
      'Changes only labels, never the file content or storage path. The user confirms the call ' +
      'in an approval tile; do not chat-ask for confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.files, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   editTarget: ({ files }) => files.map(({ id }) => ({ entity: EditLockEntity.files, id })),
   audit: {
      action: 'file.updateMany',
      resourceType: 'file',
      resourceIdFrom: (_input, output) => {
         const updated = (output as { updated?: { id: number }[] }).updated;
         return updated?.length ? updated.map(({ id }) => id).join(',') : null;
      },
   },
})
@Injectable()
export class UpdateFilesTool extends AiToolHandler<Input> {
   constructor(private readonly fileService: FileService) {
      super();
   }

   async execute(ctx: ToolContext, { files }: Input) {
      const { updated, failed } = await this.fileService.updateMany(
         files.map(({ id, currentName, displayName, language, altText }) => ({
            id,
            expectedName: currentName,
            displayName,
            language,
            altText,
         })),
         toSaveActor(ctx.user, PermissionResource.projects).canPublish,
      );
      return {
         applied: failed.length === 0,
         updatedCount: updated.length,
         updated: updated.map((file) => ({
            id: file.id,
            displayName: file.displayName,
            language: file.language,
            altText: file.altText,
         })),
         failed,
      };
   }
}
