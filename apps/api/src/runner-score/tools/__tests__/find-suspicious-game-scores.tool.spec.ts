import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { maxPlausibleScore } from '../../runner-score.rules';
import type { RunnerScoreService } from '../../runner-score.service';
import { FindSuspiciousGameScoresTool } from '../find-suspicious-game-scores.tool';

const run = (id: number, score: number, seconds: number) => ({
   id,
   nick: `N${id}`,
   score,
   seconds,
   hidden: false,
   createdAt: new Date('2026-01-01T00:00:00Z'),
});

describe('FindSuspiciousGameScoresTool', () => {
   let service: { findStats: jest.Mock };
   let tool: FindSuspiciousGameScoresTool;

   const withTop = (top: ReturnType<typeof run>[]) =>
      service.findStats.mockResolvedValue({ totalRuns: top.length, top, latest: null });

   beforeEach(() => {
      service = { findStats: jest.fn() };
      tool = new FindSuspiciousGameScoresTool(service as unknown as RunnerScoreService);
   });

   it('is read-only with runner_scores.read', () => {
      expect(Reflect.getMetadata(AiTool.KEY, FindSuspiciousGameScoresTool)).toMatchObject({
         permission: {
            resource: PermissionResource.runner_scores,
            action: PermissionAction.read,
         },
         behavior: 'readonly',
      } satisfies Partial<AiToolMetadata>);
   });

   it('flags a run above what the game can give, and a pace far above the median', async () => {
      const normal = Array.from({ length: 8 }, (_, i) => run(i + 1, 300, 100));
      const impossible = run(20, maxPlausibleScore(60) + 1, 60);
      const fast = run(21, 600, 100);
      withTop([...normal, impossible, fast]);

      const result = await tool.execute(adminContext(), {});

      expect(result.examined).toBe(10);
      expect(result.items.map(({ id, flags }) => [id, flags])).toEqual([
         [20, expect.arrayContaining(['impossible'])],
         [21, ['pace-outlier']],
      ]);
   });

   it('flags nothing for ordinary runs and caps the list at the limit', async () => {
      withTop([run(1, 300, 100), run(2, 310, 100), run(3, 290, 100)]);
      expect((await tool.execute(adminContext(), {})).items).toEqual([]);

      withTop(Array.from({ length: 5 }, (_, i) => run(i + 1, maxPlausibleScore(10) + 5, 10)));
      expect((await tool.execute(adminContext(), { limit: 2 })).items).toHaveLength(2);
   });
});
