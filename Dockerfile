FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates openssl && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs repfuel

RUN mkdir -p /app/data /app/backups && chown -R repfuel:nodejs /app

COPY --from=builder /app/public ./public
COPY --from=builder --chown=repfuel:nodejs /app/.next/standalone ./
COPY --from=builder --chown=repfuel:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=repfuel:nodejs /app/prisma ./prisma
COPY --from=builder --chown=repfuel:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=repfuel:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER repfuel
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]