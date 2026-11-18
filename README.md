# marek.media monorepo

Source code of [marek.media](https://marek.media): a portfolio website with its own headless CMS.
This repository is a read-only showcase. It is published as a snapshot of the private
development repository, so each commit here is one snapshot and the development history,
issues and pull requests are not part of it. Code comments are removed from the snapshot.

## Apps

| Path              | Description                                                                      |
| ----------------- | -------------------------------------------------------------------------------- |
| `apps/api`        | NestJS REST API with Prisma, BullMQ jobs and an AI assistant with tool approvals |
| `apps/admin`      | React 19 + Vite admin (CMS)                                                      |
| `apps/web`        | Next.js 15 public website                                                        |
| `packages/tokens` | Design tokens (CSS variables)                                                    |
| `packages/utils`  | Shared utilities                                                                 |

## Tech stack

| Layer    | Technologies                                                               |
| -------- | -------------------------------------------------------------------------- |
| Backend  | NestJS · Prisma · PostgreSQL · BullMQ · Redis (Valkey)                     |
| Frontend | Next.js 15 · React 19 · Vite · TanStack Query · shadcn/ui · Tailwind CSS 4 |
| Storage  | S3-compatible object storage                                               |
| Monorepo | Turborepo · pnpm workspaces                                                |

## Running locally

Requirements: Node.js (version in `.nvmrc`), pnpm 9 and Docker. The local stack runs Postgres,
Redis, an S3 mock and the API in Docker with throwaway data; no cloud account is needed.

```bash
pnpm install
pnpm be:up        # Postgres, Redis, S3 mock and the API on http://localhost:3247
pnpm be:seed      # local administrator: admin@local.test / local-dev-password
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
pnpm turbo dev --filter=@mm/web --filter=@mm/admin
```

The web runs on http://localhost:3047 and the admin on http://localhost:3147. `pnpm be:down`
stops the stack. How the parts fit together: [ARCHITECTURE.md](ARCHITECTURE.md).

## License

Copyright (c) 2026 Marek Marek. The code is licensed under the
[PolyForm Strict License 1.0.0](LICENSE): you may read, run and study it for noncommercial
purposes, but not distribute it or build changed or new works on it.

GitHub's Terms of Service let every GitHub user view and fork public repositories on GitHub,
whatever the license says. A fork made that way gives no further rights under the license.

Third-party code and fonts included in the repository are listed with their licenses in
[THIRD_PARTY_LICENSES](THIRD_PARTY_LICENSES).

## Contact

Through the contact page at [marek.media](https://marek.media).
