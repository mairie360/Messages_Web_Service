# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Next.js 15 (App Router, React 19, TypeScript, Tailwind 4) web service for Mairie360 hosting the internal messaging module (conversations, direct messages, groups, attachments, business references). The browser only talks to this app's own origin; the Next.js server forwards data calls to **BFF_Message**. UI building blocks come from the private package `@mairie360/lib-components`. Docs are bilingual: `docs/en|fr/module.md` (functional) and `docs/en|fr/technical.md` (routes, config, troubleshooting) — update both languages together. `BFF.md` / `BACKEND.md` contain *proposed* backend needs; the OpenAPI snapshot is the source of truth for implemented behaviour.

## Commands

Private `@mairie360/*` packages come from GitHub Packages: `.npmrc` reads `NODE_AUTH_TOKEN`, so export a token with `read:packages` before installing or building images.

```bash
npm ci
npm run dev                              # `next dev -p 5003`; needs BFF_Message reachable, see "BFF URL" below
npm run build && npm run start -- --port 5003   # `start` has no port of its own (defaults to 3000)
npm run lint                             # next lint (next/core-web-vitals + next/typescript)
npm test                                 # node:test on tests/*.test.cjs, 60% branch/function/line thresholds on src/** (source-mapped), lcov in coverage/lcov.info (what CI runs)
npm run test:contracts                   # same tests, no coverage
node --test --test-name-pattern="<name>" tests/proxy.test.cjs   # single test
docker compose up --watch                # dev stack: Postgres + Liquibase + Redis + message-api + bff-message + this front (development.Dockerfile, `src/` synced) on :5003
```

The `docker-compose.yml` dev stack pulls `dev-latest` GHCR images for the database and Message API, and `bff-message` at the contract package version. BFF_Message is the only BFF: no Core API, no BFF User (BFF_Message itself no longer calls Core, and Message API validates the JWT).

Tests are plain CommonJS `node:test` files matching `tests/*.test.cjs` (no Jest/Vitest, no DOM). Load `src/` modules with `requireSrc('<path under src>')` from `tests/support/load-ts.cjs`: it transpiles `.ts`/`.tsx` with inline source maps (so `--enable-source-maps` reports coverage on the real TS lines) and resolves the `@/*` alias. Node only measures files a test loads, so `tests/network-contract.test.cjs` requires every non-React `src/**/*.ts` module; `src/app/page.tsx` and `app-shell.tsx` are loaded by `tests/messages-page.contract-mocks.test.cjs` only, so page logic still lives in `src/lib/messaging-state.ts` and session loading in `fetchAuthSession`/`toAuthSession`.

Contract mocks follow the BFFs' `tests/support` pattern, ported to CJS:
- `FrontNetwork` (`tests/support/front-network.cjs`) replaces `global.fetch`. A relative URL is a browser call, routed like App Router to the real `src/app/**/route.ts` handler (static > dynamic > catch-all, 405 for an unexported method). An absolute URL is a server call, allowed only to the registered `ContractMockServer`; any other host is a violation, so BFF_Message is the only reachable BFF.
- `ContractMockServer` is a real HTTP server that validates each request (path, method, params, undeclared query, body and content type) and each mocked response against `contracts/openapi.json`. Orval only types successes (`2XX`) plus the statuses carried by a `<OperationId><status>` model, so any other error reply needs `outOfContract: true`.
- `tests/messages-page.contract-mocks.test.cjs` renders the real page (shell with `GET /me`, library `Messaging`) through `tests/support/server-view.cjs` (`react-dom/server` with hook state kept between passes, same file in every front, see `../CLAUDE.md`) on `FrontNetwork`: bootstrap, contacts, business references, conversation selection, sending and errors are asserted on the HTML and on the `Messaging` props. Because of the `0.3.0` contract gap below, its messages replies are `outOfContract` and the known `$body.message` request violation is filtered.
- Every test's `afterEach` asserts the mock and network violations are empty.
- Completeness guards: each `messageClient` method needs an entry in `clientScenarios`, and the proxy block replays every contract operation with `contract.sample`, so a package bump covers new routes automatically. `network-contract.test.cjs` AST-scans `src/`: only `messageClient.ts`, `auth-session.ts` and `bff-proxy.ts` may call `fetch`, no other HTTP client or socket is allowed, a single BFF base URL is read (in `bff-proxy.ts`), `/api/**` routes stay local, and every literal browser path must resolve to a route relaying a declared operation. `package-contract.test.cjs` pins the package version, the single `bff-*-openapi` dependency, the snapshot freshness and the `bff-message` image tags. Adding a network call means updating these tests.

### OpenAPI contract

The only contract is **BFF_Message's, as published in `@mairie360/bff-message-openapi`**, pinned to an exact `X.Y.Z` in `package.json`. Never copy it from a BFF checkout: the local `BFFs/BFF_Message` can be ahead of the last release. The package is orval output (`endpoints/bffMessage.ts` + `model/*.ts`, no `openapi.json`, `main` pointing at a missing `index.ts`), so:

- `scripts/orval-contract.mjs` rebuilds an OpenAPI document from it with the TypeScript compiler API (same reader as `Login_Web_Service`, plus literal types and multipart bodies). It writes the committed `contracts/openapi.json`, which the proxy imports at build time and the tests load. Never hand-edit it.
- Route types come straight from the package (`import type { GetMe200 } from '@mairie360/bff-message-openapi/model'`). Only top-level model names are stable across contract fixes, so derive the rest with indexed access (`GetContacts200['contacts'][number]`). There is no generated `.d.ts` any more.

```bash
npm install --save-exact @mairie360/bff-message-openapi@X.Y.Z   # bump: published releases only, never 0.0.0-dev/staging
npm run contracts:sync      # (= contracts:generate) rebuild contracts/openapi.json from the installed package
npm run contracts:check     # fail if the version isn't exact, installed != package.json, a second bff-*-openapi exists, or the snapshot is stale
```

These commands run offline. After a bump, also move the `bff-message` image tags in the `docker-compose*.yml` files to the same version (`package-contract.test.cjs` enforces it).

**Resolved at `0.4.0`:** `0.3.0` published the schemas of `/conversations/{conversationId}/messages` inverted (the `GET` reply typed as `SendMessageBody`, the `POST` body as the messages response). The fix landed in BFF_Message's `mair-121` release; `0.4.0` has the corrected contract, which is what `src/` is written for. After bumping the package, always run `contracts:sync` and commit the regenerated `contracts/openapi.json` in the same change — a version bump without a re-sync leaves the committed snapshot stale, which fails `contracts:check` in CI and, since it still carries the inverted schema, also fails the `sendMessage` network-contract test.

## Architecture

- **Contract-gated catch-all proxy** — `src/app/[...path]/route.ts` exports `proxyBffRequest` (`src/lib/bff-proxy.ts`) for every method. It matches the path against `contracts/openapi.json` `paths` (brace segments are wildcards): unknown path → 404, method not declared → 405 with `Allow`, `.`/`..` segments → 400; `/openapi.json` and `/swagger.json` are always forwarded. **A BFF route is therefore reachable from the browser only once the synced contract declares it.**
- **`forwardToBff`** strips hop-by-hop headers and the `cookie` header, turns the `accessToken` cookie into `Authorization: Bearer` when no Authorization header is present, keeps the query string and raw (binary) body, uses `redirect: 'manual'`, a 15 s timeout and `Cache-Control: no-store`, preserves upstream status/headers (including `Set-Cookie`, empty 204/205/304 bodies) and returns a controlled 502 JSON error when the BFF is unreachable. `tests/proxy.test.cjs` pins this behaviour.
- **BFF URL** — `BFF_MESSAGE_BASE_URL` → `MESSAGE_BFF_URL` → `NEXT_PUBLIC_BFF_MESSAGE_BASE_URL` (fallback `http://localhost:4003`); resolved at request time on the server.
- **Session** — BFF_Message is the only BFF. `src/lib/auth-session.ts` (`fetchAuthSession`, used by `useAuthSession`) reads `GET /me` through `messageClient`, normalises the role (`Admin`/`Responsable`/`Maire`/`User`/`Guest`, FR/EN aliases, `Guest` by default) and on 401 calls `logoutAndReload()`. `src/app/api/auth/logout/route.ts` is **local**: it clears the `accessToken` cookie through `clearAccessTokenCookie` (`src/lib/access-token-cookie.ts`, shared with the middleware) and makes no network call, so the JWT is not revoked server-side — exactly what BFF User's logout did.
- **Auth gate** — `src/middleware.ts` redirects every page request (matcher excludes `/api`, `/_next/*` and paths with a dot) to `LOGIN_FRONT_URL` when the `accessToken` cookie is missing or its JWT `exp` is past, clearing the cookie on `COOKIE_DOMAIN`. It only decodes the payload (a token that is not three dot-separated segments is let through; an undecodable payload counts as expired); signature validation is the BFF/Core's job. Note that the catch-all data routes (e.g. `/health`) also pass through it. For authenticated requests it also sets a per-request nonce `Content-Security-Policy` (built in `src/lib/content-security-policy.ts`, forwarded to Next.js via request headers), which is why `src/app/layout.tsx` forces dynamic rendering: a prerendered page would carry no nonce and its scripts would be blocked. Any new external origin (images, fonts, browser-side API calls) must be added to that policy, and cross-origin assets are also blocked by the static `Cross-Origin-Embedder-Policy: require-corp` / `Cross-Origin-Resource-Policy: same-origin` headers in `next.config.ts`.
- **Client calls** — pages call same-origin paths (e.g. `/messaging/bootstrap`, `/conversations`, `/contacts`) through `messageClient`, which parses `{ error: { message } }` / `{ message }` bodies into errors. Authentication relies only on the `accessToken` cookie turned into a Bearer by the proxy; unlike Projects/Administrator, this front stores no JWT in `localStorage`.
- `src/app/page.tsx` uses `src/clients/messageClient.ts` (types from the contract package) to load `/messaging/bootstrap`, then messages and contacts on demand, and maps DTOs onto the shared `Messaging` component via `src/lib/messaging-state.ts`. `src/app/profile/page.tsx` renders the library `UserProfile` (read-only) from the session. `messageClient` throws `BffRequestError` (message parsed from the body, plus the HTTP status), which is how `fetchAuthSession` tells a 401 apart.
- `src/app/business-references/route.ts` is an explicit handler that forwards to the BFF with `forwardToBff` (it takes precedence over the catch-all).
- `src/app/_components/app-shell.tsx` provides the shell/sidebar (render-prop giving pages the `useAuthSession` state); its cross-module links read the build-time `*_FRONT_URL` values, and "dashboard" points at `LOGIN_FRONT_URL`.
- This repo targets Node **22** (CI `node_version: "22"`, Dockerfile `NODE_VERSION=22.15.0`) unlike most fronts.
- `next.config.ts` sets `output: 'standalone'` (required by the Dockerfile), `poweredByHeader: false` and static security headers on every route (`tests/security-headers.test.cjs` pins them, and the ZAP baseline fails without them), and inlines the `*_FRONT_URL` values at **build time** (defaults `https://<module>.dev.mairie360-eip.fr/`), so changing them requires a rebuild.

## CI/CD

- `.github/workflows/cicd.yml` calls `mairie360/CICD/.github/workflows/frontend-cicd.yml@v2.3.1` (`package_name: message-front`, `node_version: "22"`, `cicd_version: "v2.3.1"`, `secrets: inherit`). The `@<tag>` and `cicd_version` must stay identical: `renovate.json` has a regex manager that bumps both in one grouped PR. Up to the dev release it runs: `npm ci` → `npm run lint` + `npm audit --audit-level=high` (high/critical advisories block) → `npm run build` → `npm test --if-present` (uploads `coverage/lcov.info` to Codecov) → on `main`, builds `Dockerfile` with `NODE_AUTH_TOKEN` as build-arg and pushes `ghcr.io/mairie360/message-front:dev-<sha>` / `dev-latest`. Some jobs set up Node without a registry, so the committed `.npmrc` must keep the `@mairie360` registry + `${NODE_AUTH_TOKEN}` lines.
- `.github/workflows/contracts.yml` (Node 22) runs `contracts:check` and `test:contracts` on every push/PR; both are offline now that the contract comes from the installed package.
- `Dockerfile`: two-stage `node:<ver>-bookworm-slim` build, standalone output, non-root `nextjs` user, `PORT=5003`, `CMD node server.js`.

## Isolated security & performance tests

Same pattern as the APIs/BFFs, adapted to a web front. Not part of `npm test`; they need Docker and `NODE_AUTH_TOKEN` (the front image is built from the production `Dockerfile`).

- `./security_test.sh` → `docker-compose-security.yml`: full isolated upstream stack (Postgres + Liquibase + `init-test.sql` seed, Redis, Message API, BFF_Message at the contract package version; published GHCR images, versions overridable via `*_IMAGE` env vars) + this front, then `zap-baseline.py` (spider + passive scan) authenticated with a static `accessToken` cookie. Any WARN/FAIL alert not set to IGNORE in `.zap/rules.tsv` fails the run.
- `./performance_test.sh` → `docker-compose-performance.yml`: same stack + k6 running `load-test.js` (pages, `/health`, `/me`, `/messaging/bootstrap`, `/conversations`, `/contacts` through the proxy) with a JWT minted from `JWT_SECRET`; thresholds fail the run.
- Test user is id 2 (seeded in `init-test.sql`); every service shares `JWT_SECRET=b"secret"`. `TARGET_IMAGE` lets the stacks reuse a pre-built front image. These files are excluded from the image by `.dockerignore`.

## Pull request reviewers

Every PR requests a review from the whole team, minus its author: `CarolinHugo`, `LAURETbenjamin`, `MathTek` and `Quentintnrl` (`gh pr create … --reviewer CarolinHugo,LAURETbenjamin,MathTek`). `.github/CODEOWNERS` makes GitHub request them automatically as well.
