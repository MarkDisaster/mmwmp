import { adminContext } from '../../../src/ai/tools/__tests__/tool-context.fixture';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { GetGameScoreStatsTool } from '../../../src/runner-score/tools/get-game-score-stats.tool';
import { ListGameScoresTool } from '../../../src/runner-score/tools/list-game-scores.tool';
import { getApp } from '../../setup/init';

describe('AURORA game score tools against the database (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanup = () => prisma.runnerScore.deleteMany();

   beforeEach(cleanup);
   afterAll(cleanup);

   const seed = () =>
      prisma.runnerScore.createMany({
         data: [
            { nick: 'AAA', score: 900, seconds: 150, createdAt: new Date('2026-01-01T10:00:00Z') },
            { nick: 'BBB', score: 500, seconds: 90, createdAt: new Date('2026-01-02T10:00:00Z') },
            {
               nick: 'CHT',
               score: 5000,
               seconds: 100,
               hidden: true,
               createdAt: new Date('2026-01-03T10:00:00Z'),
            },
         ],
      });

   it('reports the record without hidden runs, and the latest run with them', async () => {
      await seed();

      const stats = await getApp().get(GetGameScoreStatsTool).execute(adminContext(), {});

      expect(stats.totalRuns).toBe(3);
      expect(stats.best).toMatchObject({ nick: 'AAA', score: 900, seconds: 150 });
      expect(stats.top.map(({ nick }) => nick)).toEqual(['AAA', 'BBB']);
      expect(stats.latest).toMatchObject({ nick: 'CHT', hidden: true });
   });

   it('answers an empty game without a record', async () => {
      const stats = await getApp().get(GetGameScoreStatsTool).execute(adminContext(), {});

      expect(stats).toEqual({ totalRuns: 0, best: null, top: [], latest: null });
   });

   it('lists hidden runs too, searched by nick, sorted and paged', async () => {
      await seed();
      const tool = getApp().get(ListGameScoresTool);

      const bySearch = await tool.execute(adminContext(), { search: 'ch' });
      const byScore = await tool.execute(adminContext(), {
         sortBy: 'score',
         sortOrder: 'desc',
         limit: 1,
         page: 1,
      });

      expect(bySearch.items).toMatchObject([{ nick: 'CHT', hidden: true }]);
      expect(bySearch.total).toBe(1);
      expect(byScore.total).toBe(3);
      expect(byScore.items.map(({ nick }) => nick)).toEqual(['AAA']);
   });
});
