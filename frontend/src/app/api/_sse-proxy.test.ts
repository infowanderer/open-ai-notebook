import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sseProxy } from './_sse-proxy'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('service-bound streaming proxy', () => {
  it('reads the binding per request and forwards auth, body and query', async () => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('OPEN_NOTEBOOK_API_URL', 'https://internal.example/base/')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('data: hello\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
    )
    vi.stubGlobal('fetch', fetchMock)
    const request = new NextRequest('https://public.example/api/search/ask?mode=test', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: '{"question":"hello"}',
    })
    const response = await sseProxy(request, '/api/search/ask')
    const [url, options] = fetchMock.mock.calls[0]
    expect(url.toString()).toBe('https://internal.example/base/api/search/ask?mode=test')
    expect(options.headers.Authorization).toBe('Bearer test-token')
    expect(options.body).toBe('{"question":"hello"}')
    expect(await response.text()).toBe('data: hello\n\n')
  })

  it('fails without a Vercel binding instead of contacting localhost', async () => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('OPEN_NOTEBOOK_API_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await sseProxy(new NextRequest('https://public.example/api/search/ask'), '/api/search/ask')
    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preserves upstream auth errors', async () => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('OPEN_NOTEBOOK_API_URL', 'https://internal.example')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('{"detail":"Unauthorized"}', { status: 401 })
    ))
    const response = await sseProxy(new NextRequest('https://public.example/api/search/ask'), '/api/search/ask')
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ detail: 'Unauthorized' })
  })
})
