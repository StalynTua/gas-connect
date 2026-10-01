# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Archivos de configuración de monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Instalar dependencias y compilar
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @gasconnect/contracts run build
RUN pnpm --filter @gasconnect/api run build

# Imagen de producción ligera
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile --prod
RUN pnpm --filter @gasconnect/api exec prisma generate

COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 8000

CMD ["node", "apps/api/dist/server.js"]
