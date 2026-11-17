# Proposed: Vercel Services routing

Status: proposed; awaiting owner confirmation and runtime/storage decisions.

The repository contains a Next.js UI and FastAPI API, plus a database-backed
worker and local persistent data. The inferred Vercel catch-all routes the UI
to FastAPI and leaves Next.js inaccessible.

Keep app and frontend as service names. Route /api to app, except the two
existing Next.js streaming endpoints, which retain their streaming adapter.
Route other paths to frontend. Bind frontend to app with OPEN_NOTEBOOK_API_URL,
read only during function requests. Public browser calls stay same-origin.

This avoids a new general-purpose proxy and preserves existing streaming
behavior. Both HTTP services are public on selected paths; the binding is
private communication, not a declaration that app itself is internal.

This decision is limited to HTTP routing. Durable files, SQLite checkpoints,
worker hosting, database migrations and runtime limits remain deployment
blockers. Do not treat this change as approval for an ephemeral-data deployment.
