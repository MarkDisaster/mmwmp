import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { AUDIT_ACTION_KEY, type AuditActionMeta } from '@/audit/decorators/audit-action.decorator';
import { FileController } from '@/file/file.controller';
import { ProjectController } from '@/project/project.controller';
import { ServiceController } from '@/service/service.controller';
import { TagController } from '@/tag/tag.controller';

import { PurgeTrashTool } from '../purge-trash.tool';
import type { TrashType } from '../trash-types';

const toolAudit = (Reflect.getMetadata(AiTool.KEY, PurgeTrashTool) as AiToolMetadata).audit;
const restAudit = (handler: object) =>
   Reflect.getMetadata(AUDIT_ACTION_KEY, handler) as AuditActionMeta;

describe('PurgeTrashTool audit', () => {
   it.each([
      ['project', ProjectController.prototype.removePermanently],
      ['service', ServiceController.prototype.removePermanently],
      ['tag', TagController.prototype.removePermanently],
      ['file', FileController.prototype.removePermanently],
   ] as [TrashType, object][])(
      'audits the purge of a %s like its REST permanent delete',
      (type, handler) => {
         const resolve = (value: string | ((input: unknown) => string) | undefined) =>
            typeof value === 'function' ? value({ type, id: 5 }) : value;

         expect({
            action: resolve(toolAudit?.action),
            resourceType: resolve(toolAudit?.resourceType),
         }).toEqual({
            action: restAudit(handler).action,
            resourceType: restAudit(handler).resourceType,
         });
      },
   );
});
