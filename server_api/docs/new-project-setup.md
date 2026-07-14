Here's the final working setup:

Fix these bugs first:

- docker-compose.yml — removed duplicate build: keys; exposed Postgres 5432 and Redis 6379 to the host; told Postgres to create the yrpri_dev database on startup
- Skipped the app Dockerfiles — they're written for the old pre-TypeScript codebase and don't work with the current structure
- uuid downgraded to v9 — the CJS controller files can't require() uuid v13 which is ESM-only
- migration.ts — changed throw → return false when tables don't exist (in dev mode sequelize.sync() creates them automatically)
- startWatchWithEnv.sh — now runs build:dev first to copy views/config files before starting the watcher

Start infrastructure (one terminal, run once):

```
cd your-priorities-app/development/docker
docker compose up db redis minio mc elasticsearch mail -d
```

Start the API server (another terminal):

```
cd your-priorities-app/server_api
./startWatchWithEnv.sh
```

```
Start the frontend (optional, third terminal):
cd your-priorities-app/webApps/client
npm install && npm run start
```
