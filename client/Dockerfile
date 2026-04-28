# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
RUN npm ci --workspace client --include-workspace-root=false

COPY client ./client
WORKDIR /app/client
RUN npm run build

# ---- Stage 2: Runtime ----
FROM nginx:alpine

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
