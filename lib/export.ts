import type { Session } from '@/types'
import { formatClock } from '@/lib/metrics/stats'

export type ExportFormat = 'txt' | 'json' | 'csv'

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function sessionToTXT(session: Session): string {
  const header = [
    session.name,
    `Date: ${new Date(session.createdAt).toLocaleString()}`,
    `Provider: ${session.provider} | Language: ${session.language} | Metric source: ${session.source}`,
    '',
  ]
  const lines = session.segments.map(
    (s) => `[${formatClock(s.startMs)}]${s.speaker ? ` ${s.speaker}:` : ''} ${s.text}`,
  )
  return [...header, ...lines].join('\n')
}

export function sessionToCSV(session: Session): string {
  const rows = [['start', 'end', 'speaker', 'text', 'confidence', 'latency_ms', 'rtf', 'metric_source']]
  for (const s of session.segments) {
    rows.push([
      formatClock(s.startMs),
      formatClock(s.endMs),
      s.speaker ?? '',
      s.text,
      s.confidence === null ? '' : s.confidence.toFixed(3),
      s.latencyMs === null ? '' : String(Math.round(s.latencyMs)),
      s.rtf === null ? '' : s.rtf.toFixed(3),
      s.source,
    ])
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n')
}

export function sessionToJSON(session: Session): string {
  return JSON.stringify(session, null, 2)
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportSession(session: Session, format: ExportFormat) {
  const base = session.name.replace(/[^\w-]+/g, '_').slice(0, 60) || 'transcript'
  if (format === 'txt') downloadFile(`${base}.txt`, sessionToTXT(session), 'text/plain')
  else if (format === 'csv') downloadFile(`${base}.csv`, sessionToCSV(session), 'text/csv')
  else downloadFile(`${base}.json`, sessionToJSON(session), 'application/json')
}
