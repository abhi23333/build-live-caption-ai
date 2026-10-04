export const dynamic = 'force-dynamic'

export function GET() {
  const deepgramConfigured =
    Boolean(process.env.DEEPGRAM_API_KEY)

  return Response.json({
    externalConfigured: deepgramConfigured,
    provider: deepgramConfigured ? 'deepgram' : null,
    hasApiKey: deepgramConfigured,
  })
}
