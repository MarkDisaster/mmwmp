import { ForbiddenException } from '@nestjs/common';

import { adminContext, contextWithGrants } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { ProjectService } from '../../project.service';
import { AddTagToProjectsTool } from '../add-tag-to-projects.tool';
import { BULK_PROJECTS_MAX } from '../bulk-projects';
import { RemoveTagFromProjectsTool } from '../remove-tag-from-projects.tool';
import { UpdateProjectsStatusTool } from '../update-projects-status.tool';

const meta = (Class: object) => Reflect.getMetadata(AiTool.KEY, Class) as AiToolMetadata;
const project = (id: number) => ({ id, title: `P${id}` });
const names = (overrides: Record<number, string> = {}, tagName: string | null = 'React') =>
   jest.fn().mockImplementation((ids: number[]) =>
      Promise.resolve({
         titles: new Map(ids.filter((id) => id < 10).map((id) => [id, overrides[id] ?? `P${id}`])),
         tagName,
      }),
   );

describe('UpdateProjectsStatusTool', () => {
   let service: { updateStatus: jest.Mock; findBulkNames: jest.Mock };
   let tool: UpdateProjectsStatusTool;

   beforeEach(() => {
      service = { updateStatus: jest.fn().mockResolvedValue({}), findBulkNames: names() };
      tool = new UpdateProjectsStatusTool(service as unknown as ProjectService);
   });

   it('needs projects.publish like the single status call, and an approval tile', () => {
      expect(meta(UpdateProjectsStatusTool)).toMatchObject({
         permission: { resource: PermissionResource.projects, action: PermissionAction.publish },
         needsApproval: true,
      });
   });

   it('changes every project and reports a failing one without stopping the others', async () => {
      service.updateStatus.mockImplementation((id: number) =>
         id === 2 ? Promise.reject(new ForbiddenException('nope')) : Promise.resolve({}),
      );

      const result = await tool.execute(adminContext(), {
         projects: [project(1), project(2), project(3)],
         status: 'published',
      });

      expect(service.updateStatus).toHaveBeenCalledTimes(3);
      expect(result).toMatchObject({
         status: 'published',
         doneCount: 2,
         failedCount: 1,
         failed: [{ id: 2, title: 'P2', reason: 'nope' }],
      });
   });

   it('changes nothing when a title does not match the database (the tile would lie)', async () => {
      service.findBulkNames = names({ 2: 'Something else' });

      const result = await tool.execute(adminContext(), {
         projects: [project(1), project(2)],
         status: 'published',
      });

      expect(service.updateStatus).not.toHaveBeenCalled();
      expect(result).toMatchObject({
         applied: false,
         doneCount: 0,
         failed: [{ id: 2, reason: 'The project is titled "Something else", not "P2"' }],
      });
   });

   it('reports an unexpected error as a failure and keeps what was already changed', async () => {
      service.updateStatus.mockImplementation((id: number) =>
         id === 2 ? Promise.reject(new Error('boom')) : Promise.resolve({}),
      );

      const result = await tool.execute(adminContext(), {
         projects: [project(1), project(2), project(3)],
         status: 'draft',
      });

      expect(result).toMatchObject({
         applied: false,
         doneCount: 2,
         failed: [{ id: 2, reason: 'Unexpected error' }],
      });
   });

   it('writes the ids that really changed to the audit log', () => {
      const audit = meta(UpdateProjectsStatusTool).audit;

      expect(audit?.resourceIdFrom?.({}, { done: [{ id: 1 }, { id: 3 }] })).toBe('1,3');
      expect(audit?.resourceIdFrom?.({}, { done: [] })).toBeNull();
   });

   it('takes at most the bulk limit of projects, each id once', () => {
      const parse = (projects: unknown) =>
         meta(UpdateProjectsStatusTool).inputSchema.safeParse({ projects, status: 'draft' })
            .success;
      const many = (n: number) => Array.from({ length: n }, (_, i) => project(i + 1));

      expect(parse(many(BULK_PROJECTS_MAX))).toBe(true);
      expect(parse(many(BULK_PROJECTS_MAX + 1))).toBe(false);
      expect(parse([project(1), project(1)])).toBe(false);
   });
});

describe.each([
   ['AddTagToProjectsTool', AddTagToProjectsTool, 'addTag'],
   ['RemoveTagFromProjectsTool', RemoveTagFromProjectsTool, 'removeTag'],
] as const)('%s', (_name, Tool, method) => {
   it('needs projects.update, asks for approval and passes the caller publish right on', async () => {
      const service = { addTag: jest.fn(), removeTag: jest.fn(), findBulkNames: names() };
      const tool = new Tool(service as unknown as ProjectService);

      const result = await tool.execute(contextWithGrants([]), {
         tagId: 5,
         tagName: 'React',
         projects: [project(1)],
      });

      expect(meta(Tool)).toMatchObject({
         permission: { resource: PermissionResource.projects, action: PermissionAction.update },
         needsApproval: true,
      });
      expect(service[method]).toHaveBeenCalledWith(1, 5, { userId: 2, canPublish: false });
      expect(result).toMatchObject({ tagId: 5, tagName: 'React', doneCount: 1, failedCount: 0 });
      expect(meta(Tool).audit?.resourceIdFrom?.({ tagId: 5 }, result)).toBe('tag:5 projects:1');
   });

   it('changes nothing when the tag name is not the stored one', async () => {
      const service = { addTag: jest.fn(), removeTag: jest.fn(), findBulkNames: names({}, 'Vue') };
      const tool = new Tool(service as unknown as ProjectService);

      const result = await tool.execute(adminContext(), {
         tagId: 5,
         tagName: 'React',
         projects: [project(1)],
      });

      expect(service[method]).not.toHaveBeenCalled();
      expect(result).toMatchObject({
         applied: false,
         failed: [{ reason: expect.stringContaining('"Vue"') }],
      });
   });
});
