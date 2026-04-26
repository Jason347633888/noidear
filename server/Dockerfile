# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY src/prisma ./src/prisma
RUN npx prisma generate --schema=src/prisma/schema.prisma

COPY . .
RUN npm run build

# ---- Stage 2: Runtime ----
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

COPY src/prisma ./src/prisma
RUN npx prisma generate --schema=src/prisma/schema.prisma

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main"]
