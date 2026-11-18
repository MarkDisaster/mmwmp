import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { FileService } from '@/file/file.service';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import { ProjectService } from '@/project/project.service';
import { ServiceService } from '@/service/service.service';
import { TagService } from '@/tag/tag.service';

import { assertTrashPermission, trashTypeSchema } from './trash-types';

const inputSchema = z.object({
   type: trashTypeSchema,
   id: z
      .number()
      .int()
      .positive()
      .describe('Numeric id of the row in the trash (see `listTrash`).'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'purgeTrash',
   description:
      'Delete one row that is in the trash (Koš) for good, with everything that belongs to it. ' +
      '**Destructive — irreversible.** Only works on a row that is already in the trash; a live ' +
      'row is never deleted this way (move it to the trash first). A file that a project still ' +
      'uses is refused. The SDK pauses execution and renders a Smazat/Zrušit approval tile to the ' +
      'user — just call the tool with the type and id; do not chat-ask for confirmation first. ' +
      'The caller needs the delete permission of the chosen type.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: {
      action: ({ type }) => `${type}.deletePermanently`,
      resourceType: ({ type }) => type,
   },
})
@Injectable()
export class PurgeTrashTool extends AiToolHandler<Input> {
   constructor(
      private readonly projects: ProjectService,
      private readonly services: ServiceService,
      private readonly tags: TagService,
      private readonly files: FileService,
   ) {
      super();
   }

   async execute(ctx: ToolContext, { type, id }: Input) {
      assertTrashPermission(ctx, type);
      try {
         await {
            project: () => this.projects.removePermanently(id),
            service: () => this.services.removePermanently(id),
            tag: () => this.tags.removePermanently(id),
            file: () => this.files.removePermanently(id),
         }[type]();
         return { type, id, purged: true };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`There is no ${type} with id ${id} in the trash.`);
         }
         if (error instanceof ConflictException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
