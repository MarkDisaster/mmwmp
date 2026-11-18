import {
   adminContext,
   contextWithGrants,
   noPermissionContext,
   toolOptions,
} from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import { assertToolPermission, ToolPermissionError } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { RunnerScoreService } from '../../runner-score.service';
import { GetGameScoreStatsTool } from '../get-game-score-stats.tool';
import { ListGameScoresTool } from '../list-game-scores.tool';

const savedAt = new Date('2026-01-02T03:04:05Z');
const run = (id: number, nick: string, score: number, seconds: number, hidden = false) => ({
   id,
   nick,
   score,
   seconds,
   hidden,
   createdAt: savedAt,
});

describe.each([GetGameScoreStatsTool, ListGameScoresTool])('%p permission', (Tool) => {
   const meta = Reflect.getMetadata(AiTool.KEY, Tool) as AiToolMetadata;

   it('is read-only and requires runner_scores.read', () => {
      expect(meta.behavior).toBe('readonly');
      expect(meta.permission).toEqual({
         resource: PermissionResource.runner_scores,
         action: PermissionAction.read,
      });
   });

   it('is denied without the grant and allowed with it', () => {
      if (typeof meta.permission === 'string') throw new Error('expected a grant');
      const { resource, action } = meta.permission;

      expect(() =>
         assertToolPermission(toolOptions(noPermissionContext()), resource, action),
      ).toThrow(ToolPermissionError);
      expect(() =>
         assertToolPermission(
            toolOptions(contextWithGrants([{ resource: 'projects', action: 'read' }])),
            resource,
            action,
         ),
      ).toThrow(ToolPermissionError);
      expect(() =>
         assertToolPermission(
            toolOptions(contextWithGrants([{ resource, action }])),
            resource,
            action,
         ),
      ).not.toThrow();
   });
});

describe('GetGameScoreStatsTool', () => {
   let service: { findStats: jest.Mock };
   let tool: GetGameScoreStatsTool;

   beforeEach(() => {
      service = { findStats: jest.fn() };
      tool = new GetGameScoreStatsTool(service as unknown as RunnerScoreService);
   });

   it('reports the total, the best run, the top and the latest run with its visibility', async () => {
      service.findStats.mockResolvedValue({
         totalRuns: 42,
         top: [run(3, 'AAA', 900, 120), run(1, 'BBB', 500, 80)],
         latest: run(9, 'CCC', 10, 5, true),
      });

      const result = await tool.execute(adminContext(), {});

      expect(result).toEqual({
         totalRuns: 42,
         best: { nick: 'AAA', score: 900, seconds: 120, savedAt },
         top: [
            { nick: 'AAA', score: 900, seconds: 120, savedAt },
            { nick: 'BBB', score: 500, seconds: 80, savedAt },
         ],
         latest: { nick: 'CCC', score: 10, seconds: 5, savedAt, hidden: true },
      });
   });

   it('answers null for the best and the latest run when nothing is saved', async () => {
      service.findStats.mockResolvedValue({ totalRuns: 0, top: [], latest: null });

      expect(await tool.execute(adminContext(), {})).toEqual({
         totalRuns: 0,
         best: null,
         top: [],
         latest: null,
      });
   });
});

describe('ListGameScoresTool', () => {
   let service: { findAll: jest.Mock };
   let tool: ListGameScoresTool;

   beforeEach(() => {
      service = {
         findAll: jest.fn().mockResolvedValue({ totalCount: 1, data: [run(1, 'AAA', 500, 60)] }),
      };
      tool = new ListGameScoresTool(service as unknown as RunnerScoreService);
   });

   it('lists the newest runs first and returns only the documented fields', async () => {
      const result = await tool.execute(adminContext(), {});

      expect(service.findAll).toHaveBeenCalledWith({
         page: 0,
         limit: TOOL_LIST_DEFAULT_LIMIT,
         search: undefined,
         sortBy: 'createdAt',
         sortOrder: 'desc',
      });
      expect(result).toEqual({
         total: 1,
         items: [
            { id: 1, nick: 'AAA', score: 500, seconds: 60, hidden: false, createdAt: savedAt },
         ],
      });
   });

   it('forwards the search, the sort and the page', async () => {
      await tool.execute(adminContext(), {
         search: 'aa',
         sortBy: 'score',
         sortOrder: 'asc',
         page: 2,
         limit: 5,
      });

      expect(service.findAll).toHaveBeenCalledWith({
         page: 2,
         limit: 5,
         search: 'aa',
         sortBy: 'score',
         sortOrder: 'asc',
      });
   });

   it('caps the page size at the tool limit, in the schema and in execute', async () => {
      const schema = Reflect.getMetadata(AiTool.KEY, ListGameScoresTool).inputSchema;

      expect(schema.safeParse({ limit: TOOL_LIST_MAX_LIMIT }).success).toBe(true);
      expect(schema.safeParse({ limit: TOOL_LIST_MAX_LIMIT + 1 }).success).toBe(false);
      expect(schema.safeParse({ sortBy: 'hidden' }).success).toBe(false);

      await tool.execute(adminContext(), { limit: TOOL_LIST_MAX_LIMIT + 50 });

      expect(service.findAll).toHaveBeenCalledWith(
         expect.objectContaining({ limit: TOOL_LIST_MAX_LIMIT }),
      );
   });
});
