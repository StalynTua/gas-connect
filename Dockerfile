# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias de compilación
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# Copiar código fuente y compilar
COPY src ./src
RUN npm run build

# Imagen de producción ligera
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Instalar openssl para Prisma engine
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev
RUN npx prisma generate

# Copiar compilado desde builder
COPY --from=builder /app/dist ./dist

EXPOSE 8000

CMD ["node", "dist/server.js"]
