# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci --workspace server --include-workspace-root=false

COPY server ./server
WORKDIR /app/server
RUN npx prisma generate --schema=src/prisma/schema.prisma
RUN npm run build

# ---- Stage 2: Runtime ----
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci --workspace server --include-workspace-root=false --omit=dev

COPY server/src/prisma ./server/src/prisma
WORKDIR /app/server
RUN npx prisma generate --schema=src/prisma/schema.prisma

COPY --from=builder /app/server/dist ./dist

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main"]
