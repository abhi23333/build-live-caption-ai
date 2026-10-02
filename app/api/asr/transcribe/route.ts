export const maxDuration = 60

const MAX_BYTES = 10 * 1024 * 1024
const LANG_RE = /^[a-z]{2}-[A-Z]{2}$/

/**
 * Proxies audio to the Render Whisper ASR server.
 */
export async function POST(req: Request) {
  const endpoint = process.env.ASR_ENDPOINT

  if (!endpoint) {
    return Response.json(
      { error: 'External ASR is not configured.' },
      { status: 503 }
    )
  }

  const language =
    new URL(req.url).searchParams.get('language') ?? 'en-US'

  if (!LANG_RE.test(language)) {
    return Response.json(
      { error: 'Invalid language code.' },
      { status: 400 }
    )
  }

  const contentType =
    req.headers.get('content-type') ?? 'application/octet-stream'

  if (
    !contentType.startsWith('audio/') &&
    contentType !== 'application/octet-stream'
  ) {
    return Response.json(
      { error: 'Body must be audio.' },
      { status: 415 }
    )
  }

  const body = await req.arrayBuffer()

  if (body.byteLength === 0 || body.byteLength > MAX_BYTES) {
    return Response.json(
      { error: 'Audio chunk is empty or too large.' },
      { status: 413 }
    )
  }

  try {
    const url = new URL(endpoint)
    url.searchParams.set('language', language)

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        ...(process.env.ASR_API_KEY
          ? {
              Authorization: `Bearer ${process.env.ASR_API_KEY}`,
            }
          : {}),
      },
      body,
      signal: AbortSignal.timeout(60000),
    })

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => '')

      return Response.json(
        {
          error: `Upstream ASR returned ${upstream.status}.`,
          details: errorText.slice(0, 500),
        },
        { status: 502 }
      )
    }

    const data = (await upstream.json()) as {
      text?: unknown
      confidence?: unknown
      language?: unknown
    }

    return Response.json({
      text: typeof data.text === 'string' ? data.text : '',
      confidence:
        typeof data.confidence === 'number'
          ? data.confidence
          : null,
      language:
        typeof data.language === 'string'
          ? data.language
          : language,
    })
  } catch (error) {
    console.error('External ASR connection error:', error)

    return Response.json(
      {
        error: 'Could not reach the upstream ASR service.',
      },
      { status: 502 }
    )
  }
}
