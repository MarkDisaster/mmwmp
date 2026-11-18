import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const MIGRATION = '20261108100000_project_url_to_links';
const MIGRATIONS_DIR = join(__dirname, '../../../prisma/migrations');
const DATABASE = 'project_url_to_links';

const readMigration = (folder: string) =>
   readFileSync(join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8');

const PROJECTS: Array<[number, string | null, Array<[string | null, string, number]>]> = [
   [1, 'https://one.example.com', []],
   [
      2,
      'https://two.example.com',
      [
         ['GitHub', 'https://github.com/two', 0],
         [null, 'https://two.example.com/case', 1],
      ],
   ],
   [
      3,
      null,
      [
         ['A', 'https://a.example.com', 0],
         ['B', 'https://b.example.com', 1],
      ],
   ],
   [
      4,
      'https://four.example.com',
      Array.from({ length: 10 }, (_, i): [string, string, number] => [
         `L${i}`,
         `https://four.example.com/${i}`,
         i,
      ]),
   ],
   [
      5,
      'https://five.example.com/work',
      [
         ['Live', 'https://five.example.com/work', 0],
         ['GitHub', 'https://github.com/five', 1],
      ],
   ],
   [
      6,
      'https://six.example.com',
      [
         ['GitHub', 'https://github.com/six', 0],
         ['Live', 'https://six.example.com/', 1],
      ],
   ],
   [7, 'https://seven.example.com/p', [['Slash', 'https://seven.example.com/p/', 0]]],
   [8, '   ', [['Only', 'https://eight.example.com', 0]]],
   [9, '  https://nine.example.com  ', []],
   [10, 'https://Ten.Example.com', [['Site', 'HTTPS://ten.example.com/', 0]]],
   [11, 'https://eleven.example.com:443', [[null, 'https://eleven.example.com/', 0]]],
   [12, 'https://twelve.example.com?x=1', [['Query', 'https://twelve.example.com/?x=1', 0]]],
   [
      13,
      'https://thirteen.example.com',
      [
         ['GitHub', 'https://github.com/thirteen', 0],
         [null, 'https://thirteen.example.com', 1],
         ['Second', 'https://thirteen.example.com/', 2],
         ['Third', 'https://THIRTEEN.example.com', 3],
      ],
   ],
   [14, 'https://fourteen.example.com:8443', [[null, 'https://fourteen.example.com/', 0]]],
   [15, 'https://fifteen.example.com/Work', [[null, 'https://fifteen.example.com/work', 0]]],
   [
      16,
      'https://sixteen.example.com',
      [
         ['third', 'https://sixteen.example.com/c', 5],
         ['first', 'https://sixteen.example.com/a', 0],
         ['second', 'https://sixteen.example.com/b', 2],
      ],
   ],
   [17, 'http://seventeen.example.com:80/x', [['Old', 'http://SEVENTEEN.example.com/x', 0]]],
   [
      18,
      'https://eighteen.example.com',
      [
         ['', 'https://eighteen.example.com', 0],
         ['   ', 'https://eighteen.example.com/', 1],
         ['  Real  ', 'https://EIGHTEEN.example.com', 2],
      ],
   ],
];

describe(`Migration ${MIGRATION} (e2e)`, () => {
   let admin: pg.Client;
   let db: pg.Client;

   beforeAll(async () => {
      const url = new URL(process.env.DATABASE_URL ?? '');
      admin = new pg.Client({ connectionString: url.href });
      await admin.connect();
      await admin.query(`DROP DATABASE IF EXISTS ${DATABASE}`);
      await admin.query(`CREATE DATABASE ${DATABASE}`);

      url.pathname = `/${DATABASE}`;
      db = new pg.Client({ connectionString: url.href });
      await db.connect();

      const earlier = readdirSync(MIGRATIONS_DIR)
         .filter((dir) => !dir.endsWith('.toml') && dir < MIGRATION)
         .sort();
      for (const folder of earlier) {
         await db.query(readMigration(folder));
      }

      for (const [id, projectUrl, links] of PROJECTS) {
         await db.query(
            'INSERT INTO projects (id, slug, url, updated_at) VALUES ($1, $2, $3, now())',
            [id, `project-${id}`, projectUrl],
         );
         for (const [label, linkUrl, sortOrder] of links) {
            await db.query(
               'INSERT INTO project_links (project_id, label, url, sort_order) VALUES ($1, $2, $3, $4)',
               [id, label, linkUrl, sortOrder],
            );
         }
      }

      await db.query(readMigration(MIGRATION));
   });

   afterAll(async () => {
      await db.end();
      await admin.query(`DROP DATABASE IF EXISTS ${DATABASE}`);
      await admin.end();
   });

   const linksOf = async (projectId: number) => {
      const { rows } = await db.query<{ label: string | null; url: string; sort_order: number }>(
         'SELECT label, url, sort_order FROM project_links WHERE project_id = $1 ORDER BY sort_order',
         [projectId],
      );
      expect(rows.map((row) => row.sort_order)).toEqual(rows.map((_, index) => index));
      return rows.map((row) => [row.label, row.url]);
   };

   it('should drop the column projects.url', async () => {
      const column = await db.query(
         "SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'url'",
      );

      expect(column.rowCount).toBe(0);
   });

   it('should put the URL first without a label and move the links down', async () => {
      expect(await linksOf(1)).toEqual([[null, 'https://one.example.com']]);
      expect(await linksOf(2)).toEqual([
         [null, 'https://two.example.com'],
         ['GitHub', 'https://github.com/two'],
         [null, 'https://two.example.com/case'],
      ]);
      expect(await linksOf(16)).toEqual([
         [null, 'https://sixteen.example.com'],
         ['first', 'https://sixteen.example.com/a'],
         ['second', 'https://sixteen.example.com/b'],
         ['third', 'https://sixteen.example.com/c'],
      ]);
   });

   it('should keep all 10 additional links next to the URL', async () => {
      const links = await linksOf(4);

      expect(links).toHaveLength(11);
      expect(links[0]).toEqual([null, 'https://four.example.com']);
      expect(links.slice(1).map(([label]) => label)).toEqual(
         Array.from({ length: 10 }, (_, i) => `L${i}`),
      );
   });

   it('should leave projects without a URL as they are and trim the URL', async () => {
      expect(await linksOf(3)).toEqual([
         ['A', 'https://a.example.com'],
         ['B', 'https://b.example.com'],
      ]);
      expect(await linksOf(8)).toEqual([['Only', 'https://eight.example.com']]);
      expect(await linksOf(9)).toEqual([[null, 'https://nine.example.com']]);
   });

   it('should replace a copy of the URL and keep its label on the first link', async () => {
      expect(await linksOf(5)).toEqual([
         ['Live', 'https://five.example.com/work'],
         ['GitHub', 'https://github.com/five'],
      ]);
      expect(await linksOf(6)).toEqual([
         ['Live', 'https://six.example.com'],
         ['GitHub', 'https://github.com/six'],
      ]);
   });

   it('should find a copy the way new URL().href compared them', async () => {
      expect(await linksOf(10)).toEqual([['Site', 'https://Ten.Example.com']]);
      expect(await linksOf(11)).toEqual([[null, 'https://eleven.example.com:443']]);
      expect(await linksOf(12)).toEqual([['Query', 'https://twelve.example.com?x=1']]);
      expect(await linksOf(17)).toEqual([['Old', 'http://seventeen.example.com:80/x']]);
   });

   it('should keep the label of the first labelled copy when there are several', async () => {
      expect(await linksOf(13)).toEqual([
         ['Second', 'https://thirteen.example.com'],
         ['GitHub', 'https://github.com/thirteen'],
      ]);
   });

   it('should treat a blank label of a copy as none and trim the kept one', async () => {
      expect(await linksOf(18)).toEqual([['Real', 'https://eighteen.example.com']]);
   });

   it('should keep links with another address than the URL', async () => {
      expect(await linksOf(7)).toEqual([
         [null, 'https://seven.example.com/p'],
         ['Slash', 'https://seven.example.com/p/'],
      ]);
      expect(await linksOf(14)).toEqual([
         [null, 'https://fourteen.example.com:8443'],
         [null, 'https://fourteen.example.com/'],
      ]);
      expect(await linksOf(15)).toEqual([
         [null, 'https://fifteen.example.com/Work'],
         [null, 'https://fifteen.example.com/work'],
      ]);
   });
});
