'use client'

import { Download, FlaskConical, Trash2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { EmptyState, Panel, SourceBadge } from '@/components/metric'
import { ExperimentForm } from '@/components/experiments/experiment-form'
import { useExperiments, useHydrated } from '@/hooks/use-store'
import { downloadFile } from '@/lib/export'
import { formatMs, formatNum, formatPct } from '@/lib/metrics/stats'
import { deleteExperiment } from '@/lib/storage'
import type { Experiment } from '@/types'

const csvCell = (v: string | number | null) => {
  const s = v === null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCSV(experiments: Experiment[]) {
  const header = ['code', 'model', 'dataset', 'language', 'hardware', 'wer', 'cer', 'rtf', 'avg_latency_ms', 'p95_latency_ms', 'source', 'date', 'notes']
  const rows = experiments.map((e) =>
    [e.code, e.model, e.dataset, e.language, e.hardware, e.wer, e.cer, e.rtf, e.avgLatencyMs, e.p95LatencyMs, e.source, e.date, e.notes]
      .map(csvCell)
      .join(','),
  )
  downloadFile('experiments.csv', [header.join(','), ...rows].join('\n'), 'text/csv')
}

const dash = (v: string | null) => v ?? <span className="text-muted-foreground">—</span>

function WERChart({ experiments }: { experiments: Experiment[] }) {
  const data = experiments
    .filter((e) => e.wer !== null)
    .slice(0, 12)
    .reverse()
    .map((e) => ({ code: e.code, label: e.model, wer: Number(((e.wer as number) * 100).toFixed(2)) }))
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No experiments with a WER value yet.</p>
  }
  return (
    <div className="h-64 w-full" role="img" aria-label={`Bar chart of WER for ${data.length} experiments`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="code" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} unit="%" />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
            contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--foreground)' }}
            formatter={(value, _name, item) => [`${value}%`, `WER · ${(item.payload as { label: string }).label}`]}
          />
          <Bar dataKey="wer" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ExperimentsView() {
  const hydrated = useHydrated()
  const experiments = useExperiments()

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <ExperimentForm />
        <Panel title="WER comparison" description="Lower is better. Showing the 12 most recent experiments with a WER value.">
          {hydrated ? <WERChart experiments={experiments} /> : <div className="h-64" />}
        </Panel>
      </div>

      <Panel
        title="All experiments"
        description="Measured = computed in the Evaluation tool. Imported = entered manually."
        actions={
          experiments.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => exportCSV(experiments)}>
              <Download data-icon="inline-start" aria-hidden />
              Export CSV
            </Button>
          ) : null
        }
      >
        {!hydrated ? null : experiments.length === 0 ? (
          <EmptyState
            icon={<FlaskConical className="size-6" aria-hidden />}
            title="No experiments yet"
            description="Record a benchmark result above, or compute WER in the Evaluation tool and save it here."
          />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <caption className="sr-only">Experiment results</caption>
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  {['ID', 'Model', 'Dataset', 'Lang', 'WER', 'CER', 'RTF', 'Avg lat.', 'P95 lat.', 'Source', ''].map((h, i) => (
                    <th key={i} scope="col" className="px-5 py-2 font-medium first:pl-5">
                      {h || <span className="sr-only">Actions</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {experiments.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs text-caption">{e.code}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium">{e.model}</div>
                      <div className="text-xs text-muted-foreground">{e.hardware}</div>
                    </td>
                    <td className="px-5 py-3">{e.dataset}</td>
                    <td className="px-5 py-3">{e.language}</td>
                    <td className="px-5 py-3 font-mono tabular-nums">{dash(formatPct(e.wer, 2))}</td>
                    <td className="px-5 py-3 font-mono tabular-nums">{dash(formatPct(e.cer, 2))}</td>
                    <td className="px-5 py-3 font-mono tabular-nums">{dash(formatNum(e.rtf, 2))}</td>
                    <td className="px-5 py-3 font-mono tabular-nums">{dash(formatMs(e.avgLatencyMs))}</td>
                    <td className="px-5 py-3 font-mono tabular-nums">{dash(formatMs(e.p95LatencyMs))}</td>
                    <td className="px-5 py-3"><SourceBadge source={e.source} /></td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          if (confirm(`Delete ${e.code}?`)) deleteExperiment(e.id)
                        }}
                      >
                        <Trash2 aria-hidden />
                        <span className="sr-only">Delete {e.code}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
