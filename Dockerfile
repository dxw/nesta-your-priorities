# syntax=docker/dockerfile:1

# Root Dockerfile for Dalmatian ECS deployments.
#
# Dalmatian's default buildspec runs `docker build -t $IMAGE_REPO_NAME:test .`
# from the repository root with no `-f` flag, so the Dockerfile must live here.
# deployment/2024/your-priorities-app/Dockerfile cannot serve this purpose: it
# sits in a subdirectory and performs no build, yet its CMD references
# server_api/dist/server.js.
#
# One image serves both the web and worker processes; ECS selects between them
# with a per-service `entryPoint` override.

# ---------- Stage 1: build the Lit client ----------
FROM node:24 AS client
WORKDIR /app

COPY webApps/client/package.json webApps/client/package-lock.json ./webApps/client/
RUN cd webApps/client && npm ci

COPY webApps ./webApps

# The committed webAppsDist is copied in first for two reasons:
#   1. It holds the old Polymer client (old/client/build/bundled), the Land Use
#      Game (land_use_game/dist) and the promotion/translation apps, all still
#      served by app.ts. None are rebuilt here, so they must survive into the
#      runtime stage.
#   2. The client `build` script ends with
#        rimraf ../../server_api/webAppsDist/client/dist
#        cp -r dist/ ../../server_api/webAppsDist/client/
#      GNU cp only produces `client/dist` when `client/` already exists. If it
#      does not, the bundle lands at `client/` instead and app.ts cannot find
#      it. (BSD cp on macOS behaves differently, so this cannot be verified
#      locally on a Mac.) The mkdir below is a safety net in case the committed
#      tree is ever removed.
COPY server_api/webAppsDist ./server_api/webAppsDist

# The committed client bundle lags its source by several weeks, so it is rebuilt
# from source rather than trusted.
RUN mkdir -p server_api/webAppsDist/client \
    && cd webApps/client \
    && npm run build

# ---------- Stage 2: build the API ----------
FROM node:24 AS server
WORKDIR /app

COPY server_api/package.json server_api/package-lock.json ./server_api/
RUN cd server_api && npm ci

# server_api/tsconfig.json lists ../webApps/client/src/*.d.ts under "types",
# so the client sources must be present for tsc to resolve them.
COPY webApps ./webApps
COPY server_api ./server_api

# tsc emits dist/services/workers/main.cjs because tsconfig sets
# "allowJs": true and includes "src/**/*.cjs" with "rootDir": "./src".
RUN cd server_api && npm run build

# ---------- Stage 3: runtime ----------
FROM node:24-slim AS runtime

# imagemagick provides `identify`, without which image handling fails with
# "Command failed: identify". curl is used for health checks and debugging.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        imagemagick \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV YOUR_PRIORITIES_LISTEN_HOST=0.0.0.0

COPY server_api/package.json server_api/package-lock.json ./server_api/
RUN cd server_api && npm ci --omit=dev

COPY --from=server /app/server_api/dist ./server_api/dist
COPY --from=client /app/server_api/webAppsDist ./server_api/webAppsDist
COPY server_api/config ./server_api/config

RUN chown -R node:node /app
USER node

EXPOSE 8080

# ECS overrides entryPoint per service. This is the web process default.
CMD ["node", "--max-old-space-size=2048", "server_api/dist/server.js"]
