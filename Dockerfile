# --- Stage 1: Build ---
ARG NODE_VERSION=23.10.0
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app

# ⚠️ OBLIGATOIRE : On déclare qu'on attend un token
ARG NODE_AUTH_TOKEN

COPY package.json package-lock.json ./

# ⚠️ OBLIGATOIRE : On crée le fichier de config pour npm avec le token, on installe, on efface
RUN echo "@mairie360:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}" >> .npmrc && \
    npm ci && \
    rm .npmrc

COPY . .
RUN npm run build

# --- Stage 2: Runner ---
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app

# Sécurité & Healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 nextjs

# On copie le dossier standalone qui contient déjà son propre node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=5003

CMD ["node", "server.js"]