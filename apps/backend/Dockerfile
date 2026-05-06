FROM node:20-bookworm-slim AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json pnpm-lock.yaml* .npmrc* ./
RUN npm install -g pnpm@10 && pnpm install

COPY . .
RUN npx prisma generate
RUN pnpm build

FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/static ./static
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
