export const dynamic = 'force-dynamic'

export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: 'DEEPGRAM_API_KEY is missing' },
      { status: 500 }
    )
  }

  return Response.json({
    configured: true,
  })
}
