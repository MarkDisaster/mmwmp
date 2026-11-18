import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { ProjectController } from '@/project/project.controller';
import { CreateProjectTool } from '@/project/tools/create-project.tool';
import { ServiceController } from '@/service/service.controller';
import { CreateServiceTool } from '@/service/tools/create-service.tool';

import { AUDIT_ACTION_KEY, type AuditActionMeta } from '../decorators/audit-action.decorator';

const auditAction = (handler: unknown) =>
   (Reflect.getMetadata(AUDIT_ACTION_KEY, handler as object) as AuditActionMeta).action;
const toolAuditAction = (tool: object) =>
   (Reflect.getMetadata(AiTool.KEY, tool) as AiToolMetadata).audit?.action;

describe('audit actions of the project and service writes', () => {
   it.each([
      ['project.create', ProjectController.prototype.create],
      ['project.saveNew', ProjectController.prototype.saveNew],
      ['project.save', ProjectController.prototype.saveExisting],
      ['project.update', ProjectController.prototype.update],
      ['service.create', ServiceController.prototype.create],
      ['service.saveNew', ServiceController.prototype.saveNew],
      ['service.save', ServiceController.prototype.save],
      ['service.update', ServiceController.prototype.update],
   ])('audits %s', (action, handler) => {
      expect(auditAction(handler)).toBe(action);
   });

   it('audits the create tools, which run the aggregate save, as that save', () => {
      expect(toolAuditAction(CreateProjectTool)).toBe('project.saveNew');
      expect(toolAuditAction(CreateServiceTool)).toBe('service.saveNew');
   });
});
