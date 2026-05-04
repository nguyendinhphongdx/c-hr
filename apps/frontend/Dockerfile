FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json pnpm-lock.yaml* .npmrc* ./
RUN npm install -g pnpm@10 && pnpm install

COPY . .
RUN pnpm build

FROM node:20-bookworm-slim
WORKDIR /app

# NEXT_PUBLIC_* values are baked into the build above; the runtime
# container only needs to serve the built output.
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./

ENV PORT=3000
EXPOSE 3000
CMD ["npx", "next", "start"]
