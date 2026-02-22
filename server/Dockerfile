FROM node:20-alpine

# Prisma 需要 openssl
RUN apk add --no-cache openssl

WORKDIR /app

# 安装所有依赖（包含 prisma CLI）
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# 复制 Prisma schema 并生成适配当前平台的客户端
COPY src/prisma ./src/prisma
RUN npx prisma generate --schema=src/prisma/schema.prisma

# 复制本地已构建的 dist
COPY dist ./dist

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main"]
