# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY mobile/package.json ./mobile/package.json
COPY miniprogram/package.json ./miniprogram/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY tools/noidear-mcp/package.json ./tools/noidear-mcp/package.json
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
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY mobile/package.json ./mobile/package.json
COPY miniprogram/package.json ./miniprogram/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY tools/noidear-mcp/package.json ./tools/noidear-mcp/package.json
RUN npm ci --workspace server --include-workspace-root=false --omit=dev

COPY server/src/prisma ./server/src/prisma
WORKDIR /app/server
RUN npx prisma generate --schema=src/prisma/schema.prisma

COPY --from=builder /app/server/dist ./dist

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main"]
