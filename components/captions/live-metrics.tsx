'use client'

import { MetricStat } from '@/components/metric'
import { formatClock, formatMs, formatNum, formatPct } from '@/lib/metrics/stats'
import type { CaptionEngine } from './caption-engine'

export function LiveMetrics({ engine, compact = false }: { engine: CaptionEngine; compact?: boolean }) {
  const { stats, sources, elapsedMs, segments } = engine
  const hasData = segments.length > 0 || elapsedMs > 0
  const items = [
    { label: 'Duration', value: hasData ? formatClock(elapsedMs) : null, source: sources.base },
    { label: 'Words', value: hasData ? String(stats.words) : null, source: sources.base },
    { label: 'WPM', value: formatNum(stats.wpm), source: sources.base },
    { label: 'Avg confidence', value: formatPct(stats.avgConfidence), source: sources.confidence },
    { label: 'Avg latency', value: formatMs(stats.avgLatencyMs), source: sources.latency },
    { label: 'P50 latency', value: formatMs(stats.p50LatencyMs), source: sources.latency },
    { label: 'P95 latency', value: formatMs(stats.p95LatencyMs), source: sources.latency },
    { label: 'RTF', value: formatNum(stats.rtf, 3), source: sources.rtf },
  ]
  return (
    <div className={compact ? 'grid grid-cols-2 gap-2 sm:grid-cols-4' : 'grid grid-cols-2 gap-2'}>
      {items.map((m) => (
        <MetricStat key={m.label} label={m.label} value={m.value} source={m.source} size="sm" className="p-3" />
      ))}
    </div>
  )
}
