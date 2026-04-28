# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY mobile/package.json ./mobile/package.json
COPY miniprogram/package.json ./miniprogram/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY tools/noidear-mcp/package.json ./tools/noidear-mcp/package.json
RUN npm ci --workspace client --workspace packages/types --include-workspace-root=false

COPY client ./client
WORKDIR /app/client
RUN npm run build

# ---- Stage 2: Runtime ----
FROM nginx:alpine

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
