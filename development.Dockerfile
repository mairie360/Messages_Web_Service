# syntax=docker/dockerfile:1
ARG NODE_VERSION=24.21.0
FROM node:${NODE_VERSION}-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS builder

WORKDIR /app

# 1. On installe les outils système nécessaires une seule fois (CACHÉ)
RUN apt update && apt install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# 2. ON COPIE UNIQUEMENT les fichiers de dépendances (CACHÉ tant que tu n'ajoutes pas de lib)
COPY package.json package-lock.json ./

# 3. Credential and tracked npm policy exist only during the reproducible install.
RUN --mount=type=secret,id=node_auth_token,env=NODE_AUTH_TOKEN,required=true \
    --mount=type=bind,source=.npmrc,target=/app/.npmrc \
    npm ci

# 4. On copie le reste du code (C'est ici que tu travailles)
COPY . .

# 5. On gère les permissions à la fin
RUN useradd --system --home /app --shell /usr/sbin/nologin nextjs && \
    chown -R nextjs:nextjs /app

USER nextjs
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]
