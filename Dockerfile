FROM node:20-alpine AS base

WORKDIR /app
ENV TZ=Asia/Seoul
RUN apk add --no-cache tzdata
RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS migrator

COPY . .
RUN mkdir -p /app/data

FROM deps AS builder

COPY . .
RUN mkdir -p /app/data

ENV DATABASE_URL=file:/app/data/sqlite.db
RUN pnpm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/sqlite.db
ENV TZ=Asia/Seoul

RUN apk add --no-cache tzdata

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
