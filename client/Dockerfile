# ---- Stage 1: Build ----
FROM node:18-alpine AS builder

WORKDIR /app

# 先單獨複製 package 文件，利用 Docker layer cache
# 只有 package.json 改變時才重新 npm install
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# 再複製源碼並構建
COPY . .
RUN npm run build

# ---- Stage 2: Runtime ----
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
