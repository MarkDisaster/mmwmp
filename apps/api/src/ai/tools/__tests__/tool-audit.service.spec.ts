import type { AuditService } from '@/audit/audit.service';

import { ToolAuditService } from '../tool-audit.service';
import { contextWithGrants, TEST_CONVERSATION_ID } from './tool-context.fixture';

describe('ToolAuditService', () => {
   let audit: { log: jest.Mock };
   let service: ToolAuditService;

   beforeEach(() => {
      audit = { log: jest.fn().mockResolvedValue(undefined) };
      service = new ToolAuditService(audit as unknown as AuditService);
   });

   it('records a success as an AI actor tied to the user, conversation and request', async () => {
      const ctx = { ...contextWithGrants([]), ipAddress: '10.0.0.1', userAgent: 'jest' };

      await service.log(ctx, {
         action: 'project.delete',
         resourceType: 'project',
         resourceId: 7,
         metadata: { language: 'cs' },
      });

      expect(audit.log).toHaveBeenCalledWith({
         actorType: 'ai',
         userId: ctx.user.id,
         conversationId: TEST_CONVERSATION_ID,
         ipAddress: '10.0.0.1',
         userAgent: 'jest',
         action: 'project.delete',
         resourceType: 'project',
         resourceId: 7,
         metadata: { language: 'cs' },
      });
   });

   it('records a successful tool call without storing its input or output', async () => {
      const ctx = contextWithGrants([]);

      await service.logToolSuccess(ctx, {
         action: 'tag.create',
         resourceType: 'tag',
         resourceId: null,
      });

      expect(audit.log).toHaveBeenCalledWith(
         expect.objectContaining({
            actorType: 'ai',
            userId: ctx.user.id,
            conversationId: TEST_CONVERSATION_ID,
            action: 'tag.create',
            resourceType: 'tag',
            resourceId: null,
            metadata: undefined,
         }),
      );
   });

   it('truncates strings longer than 2000 characters inside a failed call input', async () => {
      const content = 'x'.repeat(2500);

      await service.logToolFailure(contextWithGrants([]), {
         toolName: 'upsertProjectTranslation',
         input: { projectId: 7, content, nested: [{ content }] },
         error: new Error('boom'),
      });

      const expected = 'x'.repeat(2000) + '…[truncated]';
      expect(audit.log).toHaveBeenCalledWith(
         expect.objectContaining({
            metadata: {
               input: { projectId: 7, content: expected, nested: [{ content: expected }] },
               error: 'boom',
            },
         }),
      );
   });

   it('keeps a string at the 2000-character limit, serialises dates and drops undefined', async () => {
      const edge = 'z'.repeat(2000);

      await service.logToolFailure(contextWithGrants([]), {
         toolName: 'upsertProjectTranslation',
         input: { edge, when: new Date('2026-01-02T03:04:05.000Z'), skip: undefined },
         error: new Error('boom'),
      });

      expect(audit.log).toHaveBeenCalledWith(
         expect.objectContaining({
            metadata: {
               input: { edge, when: '2026-01-02T03:04:05.000Z' },
               error: 'boom',
            },
         }),
      );
   });

   it('replaces a failed call input over 16 KB with its size only', async () => {
      const input = Object.fromEntries(
         Array.from({ length: 20 }, (_, i) => [`field${i}`, 'y'.repeat(1000)]),
      );

      await service.logToolFailure(contextWithGrants([]), {
         toolName: 'upsertContact',
         input,
         error: new Error('boom'),
      });

      const { metadata } = audit.log.mock.calls[0][0] as {
         metadata: { input: { truncated: boolean; bytes: number } };
      };
      expect(metadata.input).toEqual({ truncated: true, bytes: expect.any(Number) });
      expect(metadata.input.bytes).toBeGreaterThan(16 * 1024);
   });

   it('records a failed tool call with the redacted input and the error message', async () => {
      const ctx = contextWithGrants([]);

      await service.logToolFailure(ctx, {
         toolName: 'inviteUser',
         input: { email: 'x@example.com', password: 'hunter2' },
         error: new Error('Insufficient permissions: users.create'),
      });

      expect(audit.log).toHaveBeenCalledWith(
         expect.objectContaining({
            actorType: 'ai',
            userId: ctx.user.id,
            conversationId: TEST_CONVERSATION_ID,
            action: 'tool.inviteUser.failed',
            resourceType: 'tool',
            resourceId: 'inviteUser',
            metadata: {
               input: { email: 'x@example.com', password: '[redacted]' },
               error: 'Insufficient permissions: users.create',
            },
         }),
      );
   });

   it('redacts a tool input `value` so a failed call never persists a credential', async () => {
      await service.logToolFailure(contextWithGrants([]), {
         toolName: 'futureTool',
         input: { name: 'resend', value: 're_live_secret' },
         error: new Error('Insufficient permissions: contact.update'),
      });

      expect(audit.log).toHaveBeenCalledWith(
         expect.objectContaining({
            metadata: {
               input: { name: 'resend', value: '[redacted]' },
               error: 'Insufficient permissions: contact.update',
            },
         }),
      );
   });

   it('stringifies non-Error failures and tolerates missing input', async () => {
      await service.logToolFailure(contextWithGrants([]), {
         toolName: 'listTags',
         input: undefined,
         error: 'boom',
      });

      expect(audit.log).toHaveBeenCalledWith(
         expect.objectContaining({ metadata: { input: null, error: 'boom' } }),
      );
   });
});
