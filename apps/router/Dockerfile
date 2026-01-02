###### DEPENDENCIES
FROM --platform=linux/amd64 node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/router/package.json ./apps/router/package.json
COPY apps/builder/package.json ./apps/builder/package.json
COPY packages ./packages

RUN npm i -g pnpm
RUN pnpm i

###### BUILDER
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm i -g pnpm
RUN pnpm run build --filter=router...

###### RUNNER
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=builder --chown=hono:nodejs /app/apps/router/node_modules /app/node_modules
COPY --from=builder --chown=hono:nodejs /app/apps/router/dist /app/dist
COPY --from=builder --chown=hono:nodejs /app/apps/router/package.json /app/package.json

ENV PORT 80
EXPOSE 80

CMD ["node", "/app/dist/index.js"]