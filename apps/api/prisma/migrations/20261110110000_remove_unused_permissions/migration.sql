BEGIN;
SET LOCAL lock_timeout = '5s';

DELETE FROM "role_permissions"
WHERE ("resource"::text, "action"::text) NOT IN (
         ('projects', 'read'),
         ('projects', 'create'),
         ('projects', 'update'),
         ('projects', 'delete'),
         ('projects', 'publish'),
         ('services', 'read'),
         ('services', 'create'),
         ('services', 'update'),
         ('services', 'delete'),
         ('services', 'publish'),
         ('tags', 'read'),
         ('tags', 'create'),
         ('tags', 'update'),
         ('tags', 'delete'),
         ('files', 'read'),
         ('files', 'create'),
         ('files', 'update'),
         ('files', 'delete'),
         ('users', 'read'),
         ('users', 'create'),
         ('users', 'update'),
         ('users', 'delete'),
         ('roles', 'read'),
         ('roles', 'create'),
         ('roles', 'update'),
         ('roles', 'delete'),
         ('contact', 'read'),
         ('contact', 'update'),
         ('audit_logs', 'read'),
         ('runner_scores', 'read'),
         ('runner_scores', 'update'),
         ('runner_scores', 'delete')
);

COMMIT;
