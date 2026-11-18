import { ProjectController } from '@/project/project.controller';
import { ServiceController } from '@/service/service.controller';

import { AUDIT_ACTION_KEY, type AuditActionMeta } from '../decorators/audit-action.decorator';
import { RICH_TEXT_KEYS } from '../redact';

const auditMeta = (handler: unknown) =>
   Reflect.getMetadata(AUDIT_ACTION_KEY, handler as object) as AuditActionMeta;

const RICH_TEXT_HANDLERS = [
   ['project.saveNew', ProjectController.prototype.saveNew],
   ['project.save', ProjectController.prototype.saveExisting],
   ['project.upsertTranslation', ProjectController.prototype.upsertTranslation],
   ['project.generateTranslation', ProjectController.prototype.generateTranslation],
   ['service.saveNew', ServiceController.prototype.saveNew],
   ['service.save', ServiceController.prototype.save],
   ['service.upsertTranslation', ServiceController.prototype.upsertTranslation],
   ['service.generateTranslation', ServiceController.prototype.generateTranslation],
] as const;

describe('audit of the rich-text endpoints', () => {
   it.each(RICH_TEXT_HANDLERS)(
      '%s stores the rich text as its length and hash',
      (action, handler) => {
         expect(auditMeta(handler)).toMatchObject({ action, summarize: RICH_TEXT_KEYS });
      },
   );
});
