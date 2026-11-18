# Architecture

This is a short map of the code. [marek.media](https://marek.media) is a portfolio website with
its own headless CMS: a public site, an admin and one REST API behind both.

```text
 visitor ──► apps/web (Next.js) ──┐
                                  ├──► apps/api (NestJS) ──► PostgreSQL (Prisma)
 editor  ──► apps/admin (Vite) ───┘            │
                                               ├──► Redis (Valkey): sessions, cache, rate limits, BullMQ
                                               └──► S3-compatible object storage (files, image variants)
```

## Apps and packages

| Path              | Responsibility                                                                      |
| ----------------- | ----------------------------------------------------------------------------------- |
| `apps/api`        | REST API (NestJS), authentication, permissions, jobs, file processing, AI assistant |
| `apps/web`        | Public website (Next.js 15, App Router), localized content, SEO, runner game        |
| `apps/admin`      | CMS (React 19 + Vite): content editing, files, users and roles, audit log, AI chat  |
| `packages/tokens` | Design tokens as CSS variables (`primitives.css`, `web.css`, `admin.css`)           |
| `packages/utils`  | Small shared helpers, for example the `cn()` class name helper                      |

The web and the admin have separate components and visual design. Both read the same tokens.

## Request flow

1. The web renders pages on the server and fetches content from the API. Responses are cached
   with `unstable_cache` and tags.
2. The admin talks to the same API with a typed client generated from the OpenAPI schema
   (Kubb). A user signs in, gets a short-lived access token and a rotating refresh token, and
   every endpoint checks role permissions (action on resource).
3. After a content change the API calls a protected route of the web, which revalidates the
   cached tags, so edits appear without a rebuild.
4. The API stores data in PostgreSQL through Prisma, keeps temporary state in Redis and stores
   uploaded files in object storage. On upload it generates image variants (thumbnail, medium,
   large, original) with `sharp`; thumbnails and e-mail are handled by BullMQ jobs.

## API modules

Feature modules live directly under `apps/api/src`:

- `auth`, `user`, `role` - sign-in, sessions, users, roles and permissions
- `project`, `service`, `tag`, `contact` - the content, each with translations per language
- `file`, `storage` - uploads, image variants, object storage access
- `slug-redirect`, `revalidation`, `preview` - URL history, web cache invalidation, draft preview
- `edit-lock`, `realtime` - one editor per record, server-sent events for the admin
- `queue`, `cache`, `redis`, `rate-limit` - BullMQ, caching, rate limiting
- `audit`, `trash`, `content-insights`, `link-check` - audit log, soft delete, content checks
- `ai`, `chat` - the admin's AI assistant; its tools run with the user's permissions, some need approval
- `runner-score` - scores of the game on the website
- `common` - shared guards, filters, decorators, sanitizers (not NestJS modules)

## Rich text

1. The admin edits content in a TipTap editor and sends HTML.
2. The API sanitizes it with `sanitizeRichText` (`apps/api/src/common/sanitize`), an allowlist of
   tags, attributes and URL schemes, before it is stored.
3. The web renders the stored HTML as it is. Only the API writes it, so the sanitizer is the
   single trust boundary.

## Where to look

- Database schema: `apps/api/prisma/schema.prisma` (migrations next to it).
- Design tokens: `packages/tokens/src`.
- Environment variables: the `.env.example` file of each app.
- API documentation: Swagger UI of a running API, at `/api/docs`.
