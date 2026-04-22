FROM node:20-alpine AS builder
WORKDIR /workspace

COPY package*.json ./
COPY turbo.json ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN npm ci

COPY . .
RUN npm run build --workspace=apps/admin

FROM nginx:1.27-alpine AS runner
COPY --from=builder /workspace/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
