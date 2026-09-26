# syntax=docker/dockerfile:1
# Build context = Monorepo/ecommerce

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV CI=true
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . ./
ARG VITE_API_BASE_URL=
ARG VITE_TENANT_ID=
ARG VITE_STORE_NAME=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_TENANT_ID=$VITE_TENANT_ID \
    VITE_STORE_NAME=$VITE_STORE_NAME
RUN rm -f .env .env.local .env.*.local 2>/dev/null || true
RUN pnpm build

FROM nginx:1.27-alpine AS final
ENV API_UPSTREAM=http://api:8080
COPY nginx-spa.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
