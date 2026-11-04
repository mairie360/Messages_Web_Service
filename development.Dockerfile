# syntax=docker/dockerfile:1
ARG NODE_VERSION=24.22.1
FROM node:${NODE_VERSION}-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS builder

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
