export type AlignOp<T> =
  | { type: 'correct'; ref: T; hyp: T }
  | { type: 'substitution'; ref: T; hyp: T }
  | { type: 'deletion'; ref: T }
  | { type: 'insertion'; hyp: T }

export interface ErrorRateResult<T> {
  rate: number
  substitutions: number
  deletions: number
  insertions: number
  correct: number
  referenceLength: number
  hypothesisLength: number
  ops: AlignOp<T>[]
}

export const MAX_EVAL_WORDS = 4000
export const MAX_EVAL_CHARS = 12000

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeWords(text: string): string[] {
  const n = normalizeText(text)
  return n ? n.split(' ') : []
}

/** Levenshtein alignment with full backtrace. O(n*m) time and memory. */
export function align<T>(ref: T[], hyp: T[]): AlignOp<T>[] {
  const n = ref.length
  const m = hyp.length
  const cols = m + 1
  const dp = new Uint32Array((n + 1) * cols)
  for (let i = 0; i <= n; i++) dp[i * cols] = i
  for (let j = 0; j <= m; j++) dp[j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1
      dp[i * cols + j] = Math.min(
        dp[(i - 1) * cols + j - 1] + cost,
        dp[(i - 1) * cols + j] + 1,
        dp[i * cols + j - 1] + 1,
      )
    }
  }
  const ops: AlignOp<T>[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    const cur = dp[i * cols + j]
    if (i > 0 && j > 0) {
      const same = ref[i - 1] === hyp[j - 1]
      if (cur === dp[(i - 1) * cols + j - 1] + (same ? 0 : 1)) {
        ops.push(
          same
            ? { type: 'correct', ref: ref[i - 1], hyp: hyp[j - 1] }
            : { type: 'substitution', ref: ref[i - 1], hyp: hyp[j - 1] },
        )
        i--
        j--
        continue
      }
    }
    if (i > 0 && cur === dp[(i - 1) * cols + j] + 1) {
      ops.push({ type: 'deletion', ref: ref[i - 1] })
      i--
    } else {
      ops.push({ type: 'insertion', hyp: hyp[j - 1] })
      j--
    }
  }
  return ops.reverse()
}

function summarize<T>(ref: T[], hyp: T[]): ErrorRateResult<T> {
  const ops = align(ref, hyp)
  let s = 0
  let d = 0
  let ins = 0
  let c = 0
  for (const op of ops) {
    if (op.type === 'substitution') s++
    else if (op.type === 'deletion') d++
    else if (op.type === 'insertion') ins++
    else c++
  }
  const n = ref.length
  return {
    rate: n === 0 ? 0 : (s + d + ins) / n,
    substitutions: s,
    deletions: d,
    insertions: ins,
    correct: c,
    referenceLength: n,
    hypothesisLength: hyp.length,
    ops,
  }
}

export function computeWER(reference: string, prediction: string) {
  return summarize(tokenizeWords(reference), tokenizeWords(prediction))
}

export function computeCER(reference: string, prediction: string) {
  return summarize(Array.from(normalizeText(reference)), Array.from(normalizeText(prediction)))
}

export type EvalValidation = { ok: true } | { ok: false; error: string }

export function validateEvaluationInput(reference: unknown, prediction: unknown): EvalValidation {
  if (typeof reference !== 'string' || typeof prediction !== 'string') {
    return { ok: false, error: 'Reference and prediction must both be text.' }
  }
  if (tokenizeWords(reference).length === 0) {
    return { ok: false, error: 'Reference transcript is empty. WER is undefined without reference words.' }
  }
  if (tokenizeWords(reference).length > MAX_EVAL_WORDS || tokenizeWords(prediction).length > MAX_EVAL_WORDS) {
    return { ok: false, error: `Inputs are limited to ${MAX_EVAL_WORDS} words each.` }
  }
  if (reference.length > MAX_EVAL_CHARS * 4 || prediction.length > MAX_EVAL_CHARS * 4) {
    return { ok: false, error: 'Input text is too long.' }
  }
  return { ok: true }
}
