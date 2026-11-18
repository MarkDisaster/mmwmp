import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const MIGRATION = '20261110100000_tags_without_status';
const MIGRATIONS_DIR = join(__dirname, '../../../prisma/migrations');
const DATABASE = 'tags_without_status';

const readMigration = (folder: string) =>
   readFileSync(join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8');

const SEED = `
   INSERT INTO tags (name, slug, status, published_at, updated_at) VALUES
      ('Draft', 'draft', 'draft', NULL, now()),
      ('Published', 'published', 'published', now(), now());

   INSERT INTO roles (name, is_system, is_admin, updated_at) VALUES ('custom', false, false, now());
   INSERT INTO role_permissions (role_id, resource, action)
   SELECT r.id, p.resource::permission_resource, p.action::permission_action
   FROM roles r
   CROSS JOIN (VALUES ('tags', 'read'), ('tags', 'publish'), ('projects', 'publish')) AS p(resource, action)
   WHERE r.name = 'custom';
`;

describe(`Migration ${MIGRATION} (e2e)`, () => {
   let admin: pg.Client;
   let db: pg.Client;

   const tagColumns = async () => {
      const { rows } = await db.query<{ column_name: string }>(
         "SELECT column_name FROM information_schema.columns WHERE table_name = 'tags' ORDER BY 1",
      );
      return rows.map((row) => row.column_name);
   };

   const permissionsOf = async (role: string) => {
      const { rows } = await db.query<{ permission: string }>(
         `SELECT p.resource || ':' || p.action AS permission
          FROM role_permissions p JOIN roles r ON r.id = p.role_id
          WHERE r.name = $1 ORDER BY 1`,
         [role],
      );
      return rows.map((row) => row.permission);
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

   it('should drop the status and published_at columns and keep the rest', async () => {
      const columns = await tagColumns();

      expect(columns).not.toContain('status');
      expect(columns).not.toContain('published_at');
      expect(columns).toEqual(expect.arrayContaining(['id', 'name', 'slug', 'sort_order']));
   });

   it('should keep every tag, whatever its old status was', async () => {
      const { rows } = await db.query<{ slug: string }>('SELECT slug FROM tags ORDER BY slug');

      expect(rows.map((row) => row.slug)).toEqual(['draft', 'published']);
   });

   it('should delete only the permission tags:publish', async () => {
      expect(await permissionsOf('custom')).toEqual(['projects:publish', 'tags:read']);
      expect(await permissionsOf('editor')).toContain('tags:update');
   });

   it('should keep the publish value of the enum, other resources use it', async () => {
      const { rows } = await db.query<{ labels: string[] }>(
         `SELECT array_agg(enumlabel::text) AS labels
          FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'permission_action'`,
      );

      expect(rows[0]?.labels).toContain('publish');
   });

   it('should be safe to run twice', async () => {
      await expect(db.query(readMigration(MIGRATION))).resolves.toBeDefined();
      expect(await tagColumns()).not.toContain('status');
   });
});
