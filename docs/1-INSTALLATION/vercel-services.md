# Vercel Services deployment draft

Status: routing and binding changes only; not a production-ready deployment.

## Proposed topology (owner confirmation required)

- `app`: FastAPI at repository root, entrypoint `api.main:app`.
- `frontend`: Next.js in `frontend`.
- `/api/search/ask` and `/api/sources/:sourceId/chat/sessions/:sessionId/messages` go to the existing Next.js streaming handlers.
- All remaining `/api/:path*` requests go directly to FastAPI, preserving the /api prefix.
- Everything else goes to Next.js, including /config, assets and pages.
- Only frontend calls app, via the runtime `OPEN_NOTEBOOK_API_URL` binding. Do not configure that variable manually.
- Neither declared service is entirely internal. FastAPI /docs, /redoc, /openapi.json and /health are not publicly routed to FastAPI.
- /api/frontend-proxy intentionally reaches FastAPI and returns 404: regular uploads bypass Next.js, so its 100 MB rewrite limit must not be advertised.

The binding is used only by functions, not next.config.ts or middleware.
Docker and ordinary Next.js development retain INTERNAL_API_URL / localhost behavior.
Vercel /config returns /api, which the existing client normalizes to a same-origin base.
The streaming proxy forwards the caller's Authorization header; a binding does not bypass application auth.

## Blockers before deployment

1. SurrealDB: choose a reachable persistent instance and configure SURREAL_URL,
   SURREAL_USER, SURREAL_PASSWORD, SURREAL_NAMESPACE and SURREAL_DATABASE.
   The Docker hostname surrealdb is not a Vercel service.
2. Continuous worker: source processing, embeddings and podcasts require
   `surreal-commands-worker --import-modules commands`. It polls SurrealDB rather
   than calling the HTTP API. Choose a worker host (or evaluate Vercel Daemons);
   do not model it as a FastAPI HTTP service.
3. Durable storage: open_notebook/config.py creates ./data at import time.
   Uploads and podcasts require files shared by API and worker; chat checkpoints
   use local SQLite. The proposed function deployment has no durable shared
   filesystem configured. Moving files to /tmp does not solve persistence.
   Select a durable storage architecture and adapt these code paths first.
4. API startup automatically runs database migrations. Isolate preview databases
   and review migration concurrency before scaling.
5. Set a private OPEN_NOTEBOOK_ENCRYPTION_KEY and OPEN_NOTEBOOK_PASSWORD through
   the hosting environment. Use the same encryption key for API and worker.
6. Validate Python dependency bundle size, required system binaries, request
   upload limits and long-running streaming limits against the selected runtime.
   The existing Docker image installs system dependencies that a FastAPI
   function build does not automatically inherit.

The two-service configuration does not provision any database, worker or storage.
Confirm service names, public routes and binding direction before merging.
Storage/worker decisions may require changing this topology.

## Validation still required

No build, tests or deployment have been run for this draft.

After resolving runtime/storage blockers:
- Run the repository's Python and frontend checks from AGENTS.md.
- From the repository root run `vercel dev` to test both services and injected binding.
- Confirm / shows the UI, /config returns {"apiUrl":"/api"}, and /api/config reaches FastAPI.
- Test password rejection and authenticated CRUD.
- Test both streaming paths, cancellation and upstream error responses.
- Confirm /api/frontend-proxy returns 404 and upload limits reflect the actual runtime.
- Upload and process a source; generate/download a podcast; restart API and worker
  and verify files and chat history survive.
- Build a preview and repeat checks before any production deployment.

References:
- https://vercel.com/docs/services
- https://vercel.com/docs/services/routing
- https://vercel.com/docs/services/bindings
