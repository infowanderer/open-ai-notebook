import type { NextRequest } from 'next/server'

export async function sseProxy(req: NextRequest, upstreamPath: string) {
  // Read the binding during the request, never during build or in middleware.
  const boundUrl = process.env.OPEN_NOTEBOOK_API_URL
  if (process.env.VERCEL === '1' && !boundUrl) {
    return Response.json({ detail: 'API service binding is unavailable' }, { status: 503 })
  }
  const baseUrl = boundUrl || process.env.INTERNAL_API_URL || 'http://localhost:5055'
  const upstreamUrl = new URL(upstreamPath.replace(/^\/+/, ''), `${baseUrl.replace(/\/+$/, '')}/`)
  upstreamUrl.search = req.nextUrl.search
  const body = await req.text()
  const auth = req.headers.get('authorization')

  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
      Accept: 'text/event-stream',
    },
    body,
    cache: 'no-store',
    signal: req.signal,
  })

  if (!upstream.ok || !upstream.body) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
    })
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
