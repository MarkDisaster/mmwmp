import { ConflictException, NotFoundException } from '@nestjs/common';

import {
   adminContext,
   contextWithGrants,
   noPermissionContext,
} from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import {
   PermissionAction,
   PermissionResource,
   SlugRedirectResource,
} from '@/generated/prisma/enums';

import type { SlugRedirectService } from '../../slug-redirect.service';
import { DeleteSlugRedirectTool } from '../delete-slug-redirect.tool';
import { ListSlugRedirectsTool } from '../list-slug-redirects.tool';

const meta = (Class: object) => Reflect.getMetadata(AiTool.KEY, Class) as AiToolMetadata;

const row = (over: object = {}) => ({
   id: 5,
   oldSlug: 'old',
   targetId: 9,
   targetTitle: 'Nový',
   targetSlug: 'new',
   targetState: 'published',
   createdAt: new Date('2026-01-01'),
   ...over,
});

describe('ListSlugRedirectsTool', () => {
   let service: { findAll: jest.Mock };
   let tool: ListSlugRedirectsTool;

   beforeEach(() => {
      service = { findAll: jest.fn().mockResolvedValue({ totalCount: 1, data: [row()] }) };
      tool = new ListSlugRedirectsTool(service as unknown as SlugRedirectService);
   });

   it('is read-only with projects.read as the static grant', () => {
      expect(meta(ListSlugRedirectsTool)).toMatchObject({
         permission: { resource: PermissionResource.projects, action: PermissionAction.read },
         behavior: 'readonly',
      });
   });

   it('lists the redirects of a project with the admin link of the target', async () => {
      const result = await tool.execute(adminContext(), { type: 'project', search: 'ol' });

      expect(service.findAll).toHaveBeenCalledWith(SlugRedirectResource.project, {
         page: 0,
         limit: 20,
         search: 'ol',
      });
      expect(result).toEqual({
         type: 'project',
         total: 1,
         items: [{ ...row(), adminUrl: '/projects/9' }],
      });
   });

   it('links a service to its admin page and gives no link to a missing target', async () => {
      service.findAll.mockResolvedValue({
         totalCount: 2,
         data: [row(), row({ id: 6, targetId: 4, targetState: 'missing' })],
      });

      const result = await tool.execute(adminContext(), { type: 'service', limit: 500 });

      expect(service.findAll.mock.calls[0][1].limit).toBe(100);
      expect(result.items.map((item) => item.adminUrl)).toEqual(['/services/9', null]);
   });

   it('checks the read grant of the chosen type, not only the static one', async () => {
      const projectsOnly = contextWithGrants([
         { resource: PermissionResource.projects, action: PermissionAction.read },
      ]);

      await expect(tool.execute(projectsOnly, { type: 'service' })).rejects.toThrow(
         'Insufficient permissions: services.read',
      );
      await expect(tool.execute(noPermissionContext(), { type: 'project' })).rejects.toThrow(
         'Insufficient permissions: projects.read',
      );
      expect(service.findAll).not.toHaveBeenCalled();
   });
});

describe('DeleteSlugRedirectTool', () => {
   let service: { remove: jest.Mock };
   let tool: DeleteSlugRedirectTool;

   beforeEach(() => {
      service = {
         remove: jest.fn().mockResolvedValue({ id: 5, oldSlug: 'old', targetId: 9 }),
      };
      tool = new DeleteSlugRedirectTool(service as unknown as SlugRedirectService);
   });

   it('is mutating with an approval tile and projects.publish as the static grant', () => {
      expect(meta(DeleteSlugRedirectTool)).toMatchObject({
         permission: { resource: PermissionResource.projects, action: PermissionAction.publish },
         behavior: 'mutating',
         needsApproval: true,
         audit: { action: 'slugRedirect.delete', resourceType: 'slugRedirect' },
      });
   });

   it('deletes the redirect after checking the approved slug', async () => {
      const result = await tool.execute(adminContext(), { type: 'service', id: 5, oldSlug: 'old' });

      expect(service.remove).toHaveBeenCalledWith(SlugRedirectResource.service, 5, 'old');
      expect(result).toEqual({ type: 'service', id: 5, oldSlug: 'old', deleted: true });
   });

   it('needs the publish grant of the chosen type (update alone is not enough)', async () => {
      const projectsOnly = contextWithGrants([
         { resource: PermissionResource.projects, action: PermissionAction.publish },
      ]);

      await expect(
         tool.execute(projectsOnly, { type: 'service', id: 5, oldSlug: 'old' }),
      ).rejects.toThrow('Insufficient permissions: services.publish');
      expect(service.remove).not.toHaveBeenCalled();
   });

   it('says a missing redirect is missing and a changed slug is a conflict', async () => {
      service.remove.mockRejectedValueOnce(new NotFoundException());
      await expect(
         tool.execute(adminContext(), { type: 'project', id: 7, oldSlug: 'x' }),
      ).rejects.toThrow('There is no project slug redirect with id 7.');

      service.remove.mockRejectedValueOnce(
         new ConflictException('Slug redirect 7 is "a", not "x"'),
      );
      await expect(
         tool.execute(adminContext(), { type: 'project', id: 7, oldSlug: 'x' }),
      ).rejects.toThrow('List the redirects again.');
   });
});
