import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const MIGRATION = '20261110120000_tag_translations';
const MIGRATIONS_DIR = join(__dirname, '../../../prisma/migrations');
const DATABASE = 'tag_translations_migration';

const readMigration = (folder: string) =>
   readFileSync(join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8');

const SEED = `
   INSERT INTO tags (id, name, slug, updated_at) VALUES
      (1, 'Případová studie', 'pripadova-studie', now()),
      (2, 'React', 'react', now());
   INSERT INTO tags (id, name, slug, original_name, original_slug, deleted_at, updated_at) VALUES
      (3, 'Webdesign (trashed 3)', 'webdesign--trashed-3', 'Webdesign', 'webdesign', now(), now());
   INSERT INTO projects (id, title, slug, updated_at) VALUES (1, 'P', 'p', now());
   INSERT INTO project_tags (project_id, tag_id, sort_order) VALUES (1, 1, 0);
`;

describe(`Migration ${MIGRATION} (e2e)`, () => {
   let admin: pg.Client;
   let db: pg.Client;

   const columns = async () => {
      const { rows } = await db.query<{ column_name: string }>(
         "SELECT column_name FROM information_schema.columns WHERE table_name = 'tags' ORDER BY 1",
      );
      return rows.map((row) => row.column_name);
   };

   const translations = async () => {
      const { rows } = await db.query<{ tag_id: number; language: string; name: string }>(
         'SELECT tag_id, language::text, name FROM tag_translations ORDER BY tag_id, language',
      );
      return rows;
   };

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
      await db.query(SEED);
      await db.query(readMigration(MIGRATION));
   });

   afterAll(async () => {
      await db.end();
      await admin.query(`DROP DATABASE IF EXISTS ${DATABASE}`);
      await admin.end();
   });

   it('should keep the name of every tag, also a trashed one, as its Czech translation', async () => {
      expect(await translations()).toEqual([
         { tag_id: 1, language: 'cs', name: 'Případová studie' },
         { tag_id: 2, language: 'cs', name: 'React' },
         { tag_id: 3, language: 'cs', name: 'Webdesign' },
      ]);
   });

   it('should drop the name and the original name and keep the rest of the tag', async () => {
      const names = await columns();

      expect(names).not.toContain('name');
      expect(names).not.toContain('original_name');
      expect(names).toEqual(expect.arrayContaining(['id', 'slug', 'original_slug', 'deleted_at']));
      const { rows } = await db.query<{ id: number; slug: string }>(
         'SELECT id, slug FROM tags ORDER BY id',
      );
      expect(rows).toEqual([
         { id: 1, slug: 'pripadova-studie' },
         { id: 2, slug: 'react' },
         { id: 3, slug: 'webdesign--trashed-3' },
      ]);
   });

   it('should keep the project links', async () => {
      const { rows } = await db.query('SELECT tag_id FROM project_tags WHERE project_id = 1');

      expect(rows).toEqual([{ tag_id: 1 }]);
   });

   it('should allow an English name, only one per tag and language', async () => {
      await db.query(
         "INSERT INTO tag_translations (tag_id, language, name) VALUES (1, 'en', 'Case study')",
      );

      await expect(
         db.query(
            "INSERT INTO tag_translations (tag_id, language, name) VALUES (1, 'en', 'Other')",
         ),
      ).rejects.toThrow(/tag_translations_tag_id_language_key/);
      await expect(
         db.query(
            "INSERT INTO tag_translations (tag_id, language, name) VALUES (2, 'en', 'Case study')",
         ),
      ).resolves.toBeDefined();
   });

   it('should remove the translations with their tag', async () => {
      await db.query('DELETE FROM tags WHERE id = 3');

      expect((await translations()).filter((row) => row.tag_id === 3)).toEqual([]);
   });

   it('should keep the trash check on the trash columns of the tag', async () => {
      await expect(
         db.query("UPDATE tags SET deleted_at = now() WHERE slug = 'react'"),
      ).rejects.toThrow(/tags_trash_check/);
   });

   it('should be safe to run twice', async () => {
      await expect(db.query(readMigration(MIGRATION))).resolves.toBeDefined();
      expect(await columns()).not.toContain('name');
      expect((await translations()).filter((row) => row.language === 'cs')).toHaveLength(2);
   });
});
