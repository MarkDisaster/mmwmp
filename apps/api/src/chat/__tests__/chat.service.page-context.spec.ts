import type { ConfigService } from '@nestjs/config';
import { streamText, type SystemModelMessage } from 'ai';

import type { AiInteractionService } from '@/ai/observability/ai-interaction.service';
import type { PromptRegistryService } from '@/ai/prompts/prompt-registry.service';
import { noPermissionContext } from '@/ai/tools/__tests__/tool-context.fixture';
import type { AiToolRegistryService } from '@/ai/tools/ai-tool-registry.service';

import { ChatService } from '../chat.service';

jest.mock('ai', () => ({
   ...jest.requireActual('ai'),
   streamText: jest.fn(() => ({})),
   convertToModelMessages: jest.fn(async () => []),
}));
jest.mock('@ai-sdk/google', () => ({ google: jest.fn(() => ({ modelId: 'google-stub' })) }));
jest.mock('@ai-sdk/anthropic', () => ({
   anthropic: jest.fn(() => ({ modelId: 'anthropic-stub' })),
}));

const PERSONA = 'You are AURORA.';

describe('ChatService.streamAgent — page context', () => {
   let service: ChatService;

   beforeEach(() => {
      jest.mocked(streamText).mockClear();
      service = new ChatService(
         { get: jest.fn().mockReturnValue('google') } as unknown as ConfigService,
         {
            has: jest.fn().mockReturnValue(true),
            render: jest.fn().mockReturnValue(PERSONA),
         } as unknown as PromptRegistryService,
         { record: jest.fn() } as unknown as AiInteractionService,
         {
            getToolSet: jest.fn(() => ({})),
            getActiveToolNames: jest.fn(() => []),
         } as unknown as AiToolRegistryService,
      );
   });

   const lastSystem = () =>
      (
         jest.mocked(streamText).mock.calls.at(-1)?.[0] as unknown as {
            system: SystemModelMessage[];
         }
      ).system;

   it('appends the open page after the persona prompt, outside its cache breakpoint', async () => {
      await service.streamAgent([], noPermissionContext(), {
         kind: 'entity',
         entity: 'project',
         id: 12,
         title: 'Selltoro',
      });

      const [persona, page] = lastSystem();
      expect(persona).toEqual({
         role: 'system',
         content: PERSONA,
         providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
      });
      expect(page.content.startsWith('## Current admin page')).toBe(true);
      expect(page.content).toContain('project id 12');
      expect(page.providerOptions).toBeUndefined();
   });

   it('keeps the persona prompt alone without a resolved page', async () => {
      await service.streamAgent([], noPermissionContext());
      expect(lastSystem().map((m) => m.content)).toEqual([PERSONA]);

      await service.streamAgent([], noPermissionContext(), null);
      expect(lastSystem().map((m) => m.content)).toEqual([PERSONA]);
   });
});
