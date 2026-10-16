# =============================================================================
# wacrm — imagen de producción (Next.js 16, App Router)
#
# Multi-stage: deps -> builder -> runner. El runner conserva node_modules
# completo porque `next start` carga next.config.ts en runtime (plugin de
# next-intl) — evita sorpresas por dependencias de desarrollo faltantes.
#
# NEXT_PUBLIC_* se hornean en el build (build args): si cambian, reconstruir.
# =============================================================================

FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Mismo major de npm con el que se generó package-lock.json (npm 11):
# node:22 trae npm 10 y su validador de npm ci rechaza el lock.
RUN npm install -g npm@11.19.1
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_LOCALE=es
ARG NEXT_PUBLIC_META_APP_ID
ARG NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_LOCALE=$NEXT_PUBLIC_APP_LOCALE
ENV NEXT_PUBLIC_META_APP_ID=$NEXT_PUBLIC_META_APP_ID
ENV NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID=$NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/src/i18n ./src/i18n
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
