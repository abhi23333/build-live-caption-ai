export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const apiKey = process.env.DEEPGRAM_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: 'DEEPGRAM_API_KEY is missing' },
      { status: 500 }
    )
  }

  try {
    const audio = await request.arrayBuffer()

    if (!audio.byteLength) {
      return Response.json(
        { error: 'No audio received' },
        { status: 400 }
      )
    }

    const language =
      new URL(request.url).searchParams.get(
        'language'
      ) || 'en-US'

    console.log(
      '[Deepgram] Received audio:',
      audio.byteLength,
      'bytes'
    )

    console.log(
      '[Deepgram] Language:',
      language
    )

    const params = new URLSearchParams({
      model: 'nova-3',
      language,
      smart_format: 'true',
      punctuate: 'true',
    })

    const response = await fetch(
      `https://api.deepgram.com/v1/listen?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type':
            request.headers.get('content-type') ||
            'audio/webm',
          Accept: 'application/json',
        },
        body: audio,
        cache: 'no-store',
      }
    )

    const responseText =
      await response.text()

    console.log(
      '[Deepgram] HTTP:',
      response.status
    )

    console.log(
      '[Deepgram] Response:',
      responseText
    )

    if (!response.ok) {
      return Response.json(
        {
          error:
            `Deepgram returned ${response.status}: ${responseText}`,
        },
        { status: response.status }
      )
    }

    let data: any

    try {
      data = JSON.parse(responseText)
    } catch {
      return Response.json(
        {
          error:
            'Deepgram returned invalid JSON',
        },
        { status: 502 }
      )
    }

    const alternative =
      data?.results?.channels?.[0]
        ?.alternatives?.[0]

    const text =
      typeof alternative?.transcript ===
      'string'
        ? alternative.transcript.trim()
        : ''

    const confidence =
      typeof alternative?.confidence ===
      'number'
        ? alternative.confidence
        : null

    console.log(
      '[Deepgram] FINAL TRANSCRIPT:',
      JSON.stringify(text)
    )

    return Response.json({
      text,
      confidence,
      language,
    })
  } catch (error) {
    console.error(
      '[Deepgram] Server error:',
      error
    )

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Deepgram transcription failed',
      },
      { status: 500 }
    )
  }
}
