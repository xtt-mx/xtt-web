# syntax=docker/dockerfile:1

# =====================================================================
# Imagen de producción para el VPS de Hostinger.
# Multi-stage: la imagen final no lleva ni el código fuente ni las
# devDependencies, solo el output `standalone` de Next.
# =====================================================================

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /app

# --- Dependencias -----------------------------------------------------
# En su propia capa: mientras el lockfile no cambie, Docker la reutiliza.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- Build ------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Enciende `output: 'standalone'` en next.config.ts. Va aquí y no allá porque
# el hosting gestionado de Hostinger necesita un build normal: si `standalone`
# fuera incondicional, aquella vía se quedaría sin estáticos. Ver el comentario
# del `output` en next.config.ts.
ENV NEXT_OUTPUT_STANDALONE=true
# NEXT_PUBLIC_* se inlinea en el bundle durante el build, así que tiene que
# estar presente aquí y no solo en runtime.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CHAT_ENABLED=false
ENV NEXT_PUBLIC_CHAT_ENABLED=$NEXT_PUBLIC_CHAT_ENABLED
RUN pnpm build

# --- Runner -----------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario sin privilegios: si alguien logra ejecución remota, no es root.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# `standalone` trae su propio server.js con solo las dependencias que usa.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
