# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Next.js 15 (App Router, React 19, TypeScript, Tailwind 4) web service for Mairie360 hosting the internal messaging module (conversations, direct messages, groups, attachments, business references). The browser only talks to this app's own origin; the Next.js server forwards data calls to **BFF_Message**. UI building blocks come from the private package `@mairie360/lib-components`. Docs are bilingual: `docs/en|fr/module.md` (functional) and `docs/en|fr/technical.md` (routes, config, troubleshooting) — update both languages together. `BFF.md` / `BACKEND.md` contain *proposed* backend needs; the OpenAPI snapshot is the source of truth for implemented behaviour.

## Commands

Private `@mairie360/*` packages come from GitHub Packages: `.npmrc` reads `NODE_AUTH_TOKEN`, so export a token with `read:packages` before installing or building images.

```bash
npm ci
npm run dev -- --port 5003         # needs the BFF(s) reachable, see "BFF URL" below
npm run build && npm run start -- --port 5003
npm run lint                             # next lint (next/core-web-vitals + next/typescript)
npm test                                 # node:test on tests/*.test.cjs + lcov in coverage/lcov.info (what CI runs)
npm run test:contracts                   # same tests, no coverage
node --test --test-name-pattern="<name>" tests/proxy.test.cjs   # single test
```

Tests are plain CommonJS `node:test` files: they transpile `src/**/*.ts` on the fly with `typescript.transpileModule` via a temporary `require.extensions['.ts']` hook and stub `global.fetch`. No Jest/Vitest, no DOM tests; new tests must follow that pattern and match `tests/*.test.cjs`.

### OpenAPI contract

`contracts/openapi.json` is a committed copy of BFF_Message's contract and `src/contracts/bff.d.ts` is generated from it (`openapi-typescript@7.10.1`, pinned in `scripts/contracts.mjs`). Never hand-edit either file.

```bash
npm run contracts:sync      # copy from ../BFF_Message/contracts (or $BFF_CONTRACT_DIR) and regenerate types
npm run contracts:generate  # regenerate types from the local snapshot
npm run contracts:check     # fail if types are stale, or if a neighbouring BFF checkout has a different contract
```

## Architecture

- **Contract-gated catch-all proxy** — `src/app/[...path]/route.ts` exports `proxyBffRequest` (`src/lib/bff-proxy.ts`) for every method. It matches the path against `contracts/openapi.json` `paths` (brace segments are wildcards): unknown path → 404, method not declared → 405 with `Allow`, `.`/`..` segments → 400; `/openapi.json` and `/swagger.json` are always forwarded. **A BFF route is therefore reachable from the browser only once the synced contract declares it.**
- **`forwardToBff`** strips hop-by-hop headers and the `cookie` header, turns the `accessToken` cookie into `Authorization: Bearer` when no Authorization header is present, keeps the query string and raw (binary) body, uses `redirect: 'manual'`, a 15 s timeout and `Cache-Control: no-store`, preserves upstream status/headers (including `Set-Cookie`, empty 204/205/304 bodies) and returns a controlled 502 JSON error when the BFF is unreachable. `tests/proxy.test.cjs` pins this behaviour.
- **BFF URL** — `BFF_MESSAGE_BASE_URL` → `MESSAGE_BFF_URL` → `NEXT_PUBLIC_BFF_MESSAGE_BASE_URL` (fallback `http://localhost:4003`); resolved at request time on the server.
- **Session adapters** — `src/app/api/{user/me,auth/me,auth/session,auth/logout}/route.ts` call `userBffRequest` (`src/lib/user-bff-proxy.ts`), which reuses `forwardToBff` against BFF User (`USER_BFF_URL` → `BFF_USER_API_URL`, fallback `http://localhost:4000`). `src/lib/auth-session.ts` (`useAuthSession`) loads `/api/user/me`, normalises roles (`Admin`/`Responsable`/`Maire`/`User`/`Guest`, with FR/EN aliases) and on 401 calls `logoutAndReload()`.
- **Auth gate** — `src/middleware.ts` redirects every page request (matcher excludes `/api`, `/_next/*` and paths with a dot) to `LOGIN_FRONT_URL` when the `accessToken` cookie is missing or its JWT `exp` is past, clearing the cookie on `COOKIE_DOMAIN`. It only decodes the payload; signature validation is the BFF/Core's job. Note that the catch-all data routes (e.g. `/health`) also pass through it.
- **Client calls** — pages call same-origin paths (e.g. `/messaging/bootstrap`, `/conversations`, `/contacts`) through clients that parse `{ error: { message } }` / `{ message }` bodies into typed errors and, when no Authorization header is set, add a Bearer token stored in `localStorage` (`mairie360.auth.jwt`, see `src/lib/auth-token.ts`); in normal use the proxy relies on the cookie.
- `src/app/page.tsx` uses `src/clients/messageClient.ts` (types derived from `src/contracts/bff.d.ts`) to load `/messaging/bootstrap`, then messages and contacts on demand, and maps DTOs onto the shared `Messaging` component.
- `src/app/business-references/route.ts` is an explicit handler that forwards to the BFF with `forwardToBff` (it takes precedence over the catch-all).
- `src/app/_components/app-shell.tsx` provides the shell/sidebar.
- This repo targets Node **22** (CI `node_version: "22"`, Dockerfile `NODE_VERSION=22.15.0`) unlike most fronts.
- `next.config.ts` sets `output: 'standalone'` (required by the Dockerfile) and inlines the `*_FRONT_URL` values at **build time** (defaults `https://<module>.dev.mairie360-eip.fr/`), so changing them requires a rebuild.

## CI/CD

- `.github/workflows/cicd.yml` calls `mairie360/CICD/.github/workflows/frontend-cicd.yml@v2.0.0` (`package_name: message-front`, `node_version: "22"`, `cicd_version: v2.0.0`, `secrets: inherit`). Up to the dev release it runs: `npm ci` → `npm run lint` + `npm audit --audit-level=high` (high/critical advisories block) → `npm run build` → `npm test --if-present` (uploads `coverage/lcov.info` to Codecov) → on `main`, builds `Dockerfile` with `NODE_AUTH_TOKEN` as build-arg and pushes `ghcr.io/mairie360/message-front:dev-<sha>` / `dev-latest`. Some jobs set up Node without a registry, so the committed `.npmrc` must keep the `@mairie360` registry + `${NODE_AUTH_TOKEN}` lines.
- `.github/workflows/contracts.yml` (Node 22) runs `contracts:check` and `test:contracts` on every push/PR.
- `Dockerfile`: two-stage `node:<ver>-bookworm-slim` build, standalone output, non-root `nextjs` user, `PORT=5003`, `CMD node server.js`.

## Isolated security & performance tests

Same pattern as the APIs/BFFs, adapted to a web front. Not part of `npm test`; they need Docker and `NODE_AUTH_TOKEN` (the front image is built from the production `Dockerfile`).

- `./security_test.sh` → `docker-compose-security.yml`: full isolated upstream stack (Postgres + Liquibase + `init-test.sql` seed, Redis, Core API, BFF User, BFF_Message and its dependencies; published GHCR images, versions overridable via `*_IMAGE` env vars) + this front, then `zap-baseline.py` (spider + passive scan) authenticated with a static `accessToken` cookie. Any WARN/FAIL alert not set to IGNORE in `.zap/rules.tsv` fails the run.
- `./performance_test.sh` → `docker-compose-performance.yml`: same stack + k6 running `load-test.js` (pages, `/health`, `/api/user/me`, `/messaging/bootstrap`, `/conversations`, `/contacts` through the proxy) with a JWT minted from `JWT_SECRET`; thresholds fail the run.
- Test user is id 2 (seeded in `init-test.sql`); every service shares `JWT_SECRET=b"secret"`. `TARGET_IMAGE` lets the stacks reuse a pre-built front image. These files are excluded from the image by `.dockerignore`.
