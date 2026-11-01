# Initial server data

Messages renders confirmed initial data through the pinned published SDK GET operations, a request-local Axios adapter, and the existing same-origin proxy. Reads use `no-store` and the configured validated public origin. Only the access cookie is read on the server; refresh remains in the existing browser recovery route. No token, cookie, or unknown response field is serialized.

The server reads the messaging bootstrap and, for a validated deep link, the requested conversation. The client keeps its existing stream/polling catch-up: avoiding a duplicate bootstrap does not suppress these necessary conversation/thread reads. Composer drafts survive same-account foreground verification.

A missing/expired access context, rejected request, unavailable upstream, or invalid DTO produces an explicit unavailable receipt. Hydration retries through the existing browser route. Server rendering neither rotates cookies nor reports a failed read as successful empty data. Each server navigation supplies a fresh opaque client lifetime key; foreground updates retain local drafts.

The local `loading.tsx` uses a persistent live status and static placeholder surfaces without animation. It adds no unpublished UI dependency. Server page/loading sources retain the same 60% per-file line requirement; environment ownership grants no coverage exception.

Validation evidence and performance results are recorded separately: this implementation alone makes no latency or rendering budget claim.
