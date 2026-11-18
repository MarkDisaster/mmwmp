import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const MIGRATION = '20261110110000_remove_unused_permissions';
const MIGRATIONS_DIR = join(__dirname, '../../../prisma/migrations');
const DATABASE = 'remove_unused_permissions';

const readMigration = (folder: string) =>
   readFileSync(join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8');

const SEED = `
   INSERT INTO roles (name, is_system, is_admin, updated_at) VALUES ('custom', false, false, now());
   INSERT INTO role_permissions (role_id, resource, action)
   SELECT r.id, p.resource::permission_resource, p.action::permission_action
   FROM roles r
   CROSS JOIN (VALUES
      ('projects', 'publish'), ('tags', 'read'), ('tags', 'publish'),
      ('files', 'publish'), ('audit_logs', 'delete'), ('contact', 'create')
   ) AS p(resource, action)
   WHERE r.name = 'custom';
`;

describe(`Migration ${MIGRATION} (e2e)`, () => {
   let admin: pg.Client;
   let db: pg.Client;

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

   it('should delete the permissions that nothing checks and keep the others', async () => {
      expect(await permissionsOf('custom')).toEqual(['projects:publish', 'tags:read']);
   });

   it('should not touch the default permissions of the editor role', async () => {
      expect(await permissionsOf('editor')).toEqual(
         expect.arrayContaining(['projects:update', 'tags:create', 'files:create']),
      );
   });

   it('should be safe to run twice', async () => {
      await expect(db.query(readMigration(MIGRATION))).resolves.toBeDefined();
      expect(await permissionsOf('custom')).toEqual(['projects:publish', 'tags:read']);
   });
});
