# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Copiar archivos de configuración de monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/cab-pwa ./apps/cab-pwa

# Instalar dependencias y compilar
RUN pnpm install --frozen-lockfile
RUN pnpm --filter cab-pwa run build

# Servidor estático ultraligero Nginx Alpine (< 25 MB)
FROM nginx:alpine AS runner

COPY apps/cab-pwa/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/cab-pwa/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
