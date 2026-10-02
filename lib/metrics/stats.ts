import type { CaptionSegment } from '@/types'

export function countWords(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

export function nonNull(values: (number | null)[]): number[] {
  return values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

export interface SegmentStats {
  words: number
  wpm: number | null
  avgConfidence: number | null
  avgLatencyMs: number | null
  p50LatencyMs: number | null
  p95LatencyMs: number | null
  rtf: number | null
}

export function computeSegmentStats(segments: CaptionSegment[], durationMs: number): SegmentStats {
  const words = segments.reduce((sum, s) => sum + countWords(s.text), 0)
  const latencies = nonNull(segments.map((s) => s.latencyMs))
  const minutes = durationMs / 60000
  return {
    words,
    wpm: minutes >= 0.05 ? words / minutes : null,
    avgConfidence: mean(nonNull(segments.map((s) => s.confidence))),
    avgLatencyMs: mean(latencies),
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    rtf: mean(nonNull(segments.map((s) => s.rtf))),
  }
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export function formatPct(value: number | null, digits = 1): string | null {
  if (value === null || !Number.isFinite(value)) return null
  return `${(value * 100).toFixed(digits)}%`
}

export function formatMs(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null
  return `${Math.round(value)} ms`
}

export function formatNum(value: number | null, digits = 0): string | null {
  if (value === null || !Number.isFinite(value)) return null
  return value.toFixed(digits)
}

export function uid(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}${Date.now().toString(36)}${rand}`
}
