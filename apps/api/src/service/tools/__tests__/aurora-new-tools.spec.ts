import { ConflictException, NotFoundException } from '@nestjs/common';

import { adminContext, contextWithGrants } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { EntityStatus, PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import type { PreviewService } from '@/preview/preview.service';

import type { ServiceService } from '../../service.service';
import { CreateServiceTool } from '../create-service.tool';
import { GenerateServiceTranslationTool } from '../generate-service-translation.tool';
import { GetServicePreviewUrlTool } from '../get-service-preview-url.tool';

const meta = (Class: object) => Reflect.getMetadata(AiTool.KEY, Class) as AiToolMetadata;
const servicesGrant = (action: PermissionAction) => ({
   resource: PermissionResource.services,
   action,
});

describe('CreateServiceTool', () => {
   let service: { saveNew: jest.Mock };
   let tool: CreateServiceTool;

   beforeEach(() => {
      service = {
         saveNew: jest
            .fn()
            .mockResolvedValue({ id: 7, slug: 'web', title: 'Web', status: 'draft' }),
      };
      tool = new CreateServiceTool(service as unknown as ServiceService);
   });

   it('needs services.create and asks for approval only when it publishes', () => {
      const { permission, needsApproval } = meta(CreateServiceTool);

      expect(permission).toEqual(servicesGrant(PermissionAction.create));
      expect(typeof needsApproval === 'function' && needsApproval({ status: undefined })).toBe(
         false,
      );
      expect(
         typeof needsApproval === 'function' && needsApproval({ status: EntityStatus.published }),
      ).toBe(true);
   });

   it('saves a draft through the REST aggregate save and returns the admin url', async () => {
      const result = await tool.execute(adminContext(), { slug: 'web', cs: { title: 'Web' } });

      expect(service.saveNew).toHaveBeenCalledWith(
         expect.objectContaining({
            slug: 'web',
            showOnHomepage: false,
            translations: [{ language: 'cs', title: 'Web' }],
            projectIds: [],
         }),
         { userId: 1, canPublish: true },
      );
      expect(result).toEqual({
         id: 7,
         slug: 'web',
         title: 'Web',
         status: 'draft',
         adminUrl: '/services/7',
      });
   });

   it('passes a caller without the publish permission on, so the service refuses to publish', async () => {
      await tool.execute(contextWithGrants([servicesGrant(PermissionAction.create)]), {
         slug: 'web',
         cs: { title: 'Web' },
         status: EntityStatus.published,
      });

      expect(service.saveNew.mock.calls[0][1]).toEqual({ userId: 2, canPublish: false });
   });

   it('turns a taken slug into a readable error', async () => {
      service.saveNew.mockRejectedValue(new ConflictException('Slug already exists'));

      await expect(
         tool.execute(adminContext(), { slug: 'web', cs: { title: 'Web' } }),
      ).rejects.toThrow('Slug already exists');
   });
});

describe('GetServicePreviewUrlTool', () => {
   it('is read-only, signs through PreviewService and reports a missing service', async () => {
      const service = { findOne: jest.fn().mockResolvedValue({ id: 3, slug: 'x' }) };
      const preview = { getPreviewUrl: jest.fn().mockReturnValue('https://web/api/draft?t=1') };
      const tool = new GetServicePreviewUrlTool(
         service as unknown as ServiceService,
         preview as unknown as PreviewService,
      );

      expect(meta(GetServicePreviewUrlTool)).toMatchObject({
         permission: servicesGrant(PermissionAction.read),
         behavior: 'readonly',
      });
      expect(await tool.execute(adminContext(), { id: 3, locale: 'en' })).toEqual({
         previewUrl: 'https://web/api/draft?t=1',
         expiresInMinutes: 5,
      });
      expect(preview.getPreviewUrl).toHaveBeenCalledWith('services', { id: 3, slug: 'x' }, 'en');

      service.findOne.mockRejectedValue(new NotFoundException());
      await expect(tool.execute(adminContext(), { id: 9 })).rejects.toThrow(
         'Service with id 9 not found.',
      );
   });
});

describe('GenerateServiceTranslationTool', () => {
   let service: { findOne: jest.Mock; generateTranslation: jest.Mock };
   let tool: GenerateServiceTranslationTool;

   beforeEach(() => {
      service = {
         findOne: jest.fn().mockResolvedValue({
            translations: [{ language: 'en', title: 'Web', description: null, content: 'c' }],
         }),
         generateTranslation: jest.fn().mockResolvedValue({ title: 'Web cs' }),
      };
      tool = new GenerateServiceTranslationTool(service as unknown as ServiceService);
   });

   it('asks for approval on every call and needs services.update', () => {
      expect(meta(GenerateServiceTranslationTool)).toMatchObject({
         permission: servicesGrant(PermissionAction.update),
         needsApproval: true,
         audit: { action: 'service.generateTranslation' },
      });
   });

   it('translates the other language once and saves nothing', async () => {
      const result = await tool.execute(adminContext(), { serviceId: 2, targetLanguage: 'cs' });

      expect(service.generateTranslation).toHaveBeenCalledTimes(1);
      expect(service.generateTranslation).toHaveBeenCalledWith(
         2,
         'cs',
         { title: 'Web', description: null, content: 'c' },
         adminContext().user.id,
      );
      expect(result).toEqual({ serviceId: 2, language: 'cs', saved: false, title: 'Web cs' });
   });

   it('does not call the model without a source translation', async () => {
      await expect(
         tool.execute(adminContext(), { serviceId: 2, targetLanguage: 'en' }),
      ).rejects.toThrow('no Czech version');
      expect(service.generateTranslation).not.toHaveBeenCalled();
   });
});
