import { computeCER, computeWER, validateEvaluationInput } from '@/lib/metrics/wer'

export async function POST(req: Request) {
  let payload: { reference?: unknown; prediction?: unknown }
  try {
    payload = await req.json()
  } catch {
    return Response.json({ error: 'Body must be JSON.' }, { status: 400 })
  }
  const check = validateEvaluationInput(payload.reference, payload.prediction)
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 })

  const reference = payload.reference as string
  const prediction = payload.prediction as string
  const { ops: _w, ...wer } = computeWER(reference, prediction)
  const { ops: _c, ...cer } = computeCER(reference, prediction)
  return Response.json({ wer, cer, source: 'MEASURED' })
}
