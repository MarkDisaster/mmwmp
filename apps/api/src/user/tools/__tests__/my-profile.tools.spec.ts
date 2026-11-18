import { NotFoundException } from '@nestjs/common';

import { contextWithGrants } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';

import type { UserService } from '../../user.service';
import { GetMyProfileTool } from '../get-my-profile.tool';
import { UpdateMyNameTool } from '../update-my-name.tool';

const meta = (Class: object) => Reflect.getMetadata(AiTool.KEY, Class) as AiToolMetadata;
const ctx = () => contextWithGrants([]);

describe('GetMyProfileTool', () => {
   it('needs only a signed-in actor and reads the profile of that actor', async () => {
      const service = {
         findOne: jest.fn().mockResolvedValue({
            id: 2,
            email: 'jana@x.cz',
            firstName: 'Jana',
            lastName: 'Nová',
            passwordHash: 'never',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            role: {
               name: 'Editor',
               isAdmin: false,
               permissions: [{ resource: 'projects', action: 'read' }],
            },
         }),
      };
      const tool = new GetMyProfileTool(service as unknown as UserService);

      const result = await tool.execute(ctx(), {});

      expect(meta(GetMyProfileTool)).toMatchObject({
         permission: 'authenticated',
         behavior: 'readonly',
      });
      expect(service.findOne).toHaveBeenCalledWith(2);
      expect(result).toEqual({
         id: 2,
         email: 'jana@x.cz',
         firstName: 'Jana',
         lastName: 'Nová',
         role: { name: 'Editor', isAdmin: false, permissions: ['projects.read'] },
         createdAt: new Date('2026-01-01T00:00:00Z'),
      });
   });

   it('answers a vanished account with a readable error', async () => {
      const service = { findOne: jest.fn().mockRejectedValue(new NotFoundException()) };

      await expect(
         new GetMyProfileTool(service as unknown as UserService).execute(ctx(), {}),
      ).rejects.toThrow('Your account was not found.');
   });
});

describe('UpdateMyNameTool', () => {
   it('changes the name of the caller only, never another user', async () => {
      const service = {
         updateName: jest.fn().mockResolvedValue({ id: 2, firstName: 'Jana', lastName: 'Nová' }),
      };
      const tool = new UpdateMyNameTool(service as unknown as UserService);

      const result = await tool.execute(ctx(), { firstName: 'Jana', lastName: 'Nová' });

      expect(service.updateName).toHaveBeenCalledWith(2, { firstName: 'Jana', lastName: 'Nová' });
      expect(result).toEqual({ id: 2, firstName: 'Jana', lastName: 'Nová' });
      expect(meta(UpdateMyNameTool)).toMatchObject({
         permission: 'authenticated',
         behavior: 'mutating',
         audit: { action: 'user.updateName' },
      });
   });

   it('has no id, password or avatar input', () => {
      const shape = Object.keys(
         (meta(UpdateMyNameTool).inputSchema as unknown as { shape: object }).shape,
      );

      expect(shape).toEqual(['firstName', 'lastName']);
   });
});
