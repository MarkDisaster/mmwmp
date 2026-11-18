# syntax=docker/dockerfile:1.6
FROM node:22-alpine AS pruned
WORKDIR /app
RUN corepack enable
ARG TURBO_VERSION=2.9.12
COPY . .
RUN pnpm dlx turbo@${TURBO_VERSION} prune @mm/api --docker

FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app
COPY --from=pruned /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruned /app/out/full/ .
COPY tsconfig.base.json ./
RUN pnpm turbo build --filter=@mm/api
RUN pnpm --filter=@mm/api --prod deploy /prod/api

FROM node:22-alpine
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /prod/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=pruned /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=pruned /app/apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
RUN chmod +x apps/api/docker-entrypoint.sh
USER node
ENTRYPOINT ["apps/api/docker-entrypoint.sh"]
