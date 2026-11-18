import { NotFoundException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';

import type { RoleService } from '../../role.service';
import { GetRoleTool } from '../get-role.tool';

describe('GetRoleTool', () => {
   let service: { findOne: jest.Mock };
   let tool: GetRoleTool;

   beforeEach(() => {
      service = {
         findOne: jest.fn().mockResolvedValue({
            id: 4,
            name: 'Editor',
            isSystem: false,
            isAdmin: false,
            updatedAt: new Date('2026-04-01T10:00:00Z'),
            createdAt: new Date('2026-03-01T10:00:00Z'),
            permissions: [
               { resource: 'projects', action: 'read' },
               { resource: 'projects', action: 'update' },
               { resource: 'audit_logs', action: 'read' },
            ],
         }),
      };
      tool = new GetRoleTool(service as unknown as RoleService);
   });

   it('returns every grant grouped by resource, including resources outside the old enum', async () => {
      await expect(tool.execute(adminContext(), { id: 4 })).resolves.toMatchObject({
         id: 4,
         name: 'Editor',
         permissions: { projects: ['read', 'update'], audit_logs: ['read'] },
         permissionCount: 3,
         adminUrl: '/roles/4',
      });
   });

   it('translates a missing role into an agent-readable error', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(tool.execute(adminContext(), { id: 9 })).rejects.toThrow(
         /Role with id 9 not found/,
      );
   });
});
