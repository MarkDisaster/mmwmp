import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const MIGRATION = '20261108110000_drop_configs';
const MIGRATIONS_DIR = join(__dirname, '../../../prisma/migrations');
const DATABASE = 'drop_configs';

const readMigration = (folder: string) =>
   readFileSync(join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8');

const SEED = `
   INSERT INTO users (id, email, first_name, last_name, role_id, updated_at)
   SELECT 900, 'old@test.com', 'Old', 'User', id, now() FROM roles WHERE name = 'editor';

   INSERT INTO configs (key, value, is_public, created_by_id, updated_at) VALUES
      ('site_title', '{"cs": "Ahoj"}', true, 900, now()),
      ('secret_key', '"abc"', false, NULL, now());

   INSERT INTO roles (name, is_system, is_admin, updated_at) VALUES ('custom', false, false, now());
   INSERT INTO role_permissions (role_id, resource, action)
   SELECT r.id, p.resource::permission_resource, p.action::permission_action
   FROM roles r
   CROSS JOIN (VALUES ('config', 'read'), ('config', 'update'), ('config', 'delete'),
      ('projects', 'read'), ('runner_scores', 'delete')) AS p(resource, action)
   WHERE r.name = 'custom';

   INSERT INTO audit_logs (user_id, actor_type, action, resource_type, resource_id) VALUES
      (900, 'user', 'config.upsert', 'config', 'site_title'),
      (900, 'ai', 'config.delete', 'config', 'secret_key');
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

   const tableExists = async () => {
      const { rows } = await db.query<{ table: string | null }>(
         "SELECT to_regclass('public.configs')::text AS table",
      );
      return rows[0]?.table !== null;
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
   });

   afterAll(async () => {
      await db.end();
      await admin.query(`DROP DATABASE IF EXISTS ${DATABASE}`);
      await admin.end();
   });

   it('should roll back everything when a statement fails', async () => {
      await db.query('CREATE VIEW blocker AS SELECT resource FROM role_permissions');

      await expect(db.query(readMigration(MIGRATION))).rejects.toThrow(
         /cannot alter type of a column used by a view or rule/,
      );
      await db.query('ROLLBACK');
      await db.query('DROP VIEW blocker');

      expect(await tableExists()).toBe(true);
      expect(await permissionsOf('custom')).toEqual([
         'config:delete',
         'config:read',
         'config:update',
         'projects:read',
         'runner_scores:delete',
      ]);
      const types = await db.query(
         "SELECT 1 FROM pg_type WHERE typname = 'permission_resource_new'",
      );
      expect(types.rowCount).toBe(0);
   });

   describe('applied', () => {
      beforeAll(async () => {
         await db.query(readMigration(MIGRATION));
      });

      it('should drop the table configs', async () => {
         expect(await tableExists()).toBe(false);
      });

      it('should delete the permissions on config and keep the others', async () => {
         expect(await permissionsOf('custom')).toEqual(['projects:read', 'runner_scores:delete']);
         expect(await permissionsOf('editor')).toEqual([
            'contact:read',
            'files:create',
            'files:read',
            'projects:create',
            'projects:read',
            'projects:update',
            'services:create',
            'services:read',
            'services:update',
            'tags:create',
            'tags:read',
            'tags:update',
         ]);
      });

      it('should remove config from the enum permission_resource', async () => {
         const { rows } = await db.query<{ labels: string[] }>(
            `SELECT array_agg(enumlabel::text ORDER BY enumsortorder) AS labels
             FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
             WHERE t.typname = 'permission_resource'`,
         );

         expect(rows[0]?.labels).toEqual([
            'projects',
            'services',
            'tags',
            'files',
            'users',
            'roles',
            'contact',
            'audit_logs',
            'runner_scores',
         ]);
         await expect(
            db.query(
               "INSERT INTO role_permissions (role_id, resource, action) SELECT id, 'config', 'read' FROM roles WHERE name = 'custom'",
            ),
         ).rejects.toThrow(/invalid input value for enum permission_resource: "config"/);
      });

      it('should leave no temporary enum type behind', async () => {
         const { rows } = await db.query<{ typname: string }>(
            "SELECT typname FROM pg_type WHERE typname LIKE '%permission_resource%' ORDER BY 1",
         );

         expect(rows.map((row) => row.typname)).toEqual([
            '_permission_resource',
            'permission_resource',
         ]);
      });

      it('should keep the audit entries of config changes', async () => {
         const { rows } = await db.query<{ action: string }>(
            "SELECT action FROM audit_logs WHERE resource_type = 'config' ORDER BY id",
         );

         expect(rows.map((row) => row.action)).toEqual(['config.upsert', 'config.delete']);
      });
   });
});
