export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({
    externalConfigured: Boolean(process.env.ASR_ENDPOINT),
    provider: process.env.ASR_PROVIDER ?? null,
    hasApiKey: Boolean(process.env.ASR_API_KEY),
  })
}
