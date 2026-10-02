'use client'

import Link from 'next/link'
import { ArrowRight, AudioLines, FileText, FlaskConical, Gauge } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState, MetricStat, Panel, SourceBadge } from '@/components/metric'
import { useExperiments, useHydrated, useSessions } from '@/hooks/use-store'
import { PROVIDER_LABEL } from '@/lib/asr/registry'
import { formatClock, formatNum, formatPct, mean, nonNull } from '@/lib/metrics/stats'

const dayFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

const QUICK = [
  { href: '/live', label: 'Start live captions', icon: AudioLines },
  { href: '/evaluation', label: 'Compute WER', icon: Gauge },
  { href: '/experiments', label: 'Log an experiment', icon: FlaskConical },
  { href: '/transcripts', label: 'Browse transcripts', icon: FileText },
]

export function DashboardView() {
  const hydrated = useHydrated()
  const sessions = useSessions()
  const experiments = useExperiments()
  if (!hydrated) return null

  const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0)
  const totalWords = sessions.reduce((sum, s) => sum + s.wordCount, 0)
  const avgWpm = mean(nonNull(sessions.map((s) => s.wpm)))
  const measuredWer = experiments.filter((e) => e.wer !== null)
  const best = measuredWer.reduce<(typeof measuredWer)[number] | null>(
    (acc, e) => (acc === null || (e.wer as number) < (acc.wer as number) ? e : acc),
    null,
  )

  const trend = [...sessions]
    .reverse()
    .slice(-20)
    .map((s) => ({ date: dayFmt.format(new Date(s.createdAt)), wpm: s.wpm === null ? null : Math.round(s.wpm), name: s.name }))

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricStat label="Sessions" value={String(sessions.length)} source="MEASURED" size="lg" />
        <MetricStat label="Captioned time" value={formatClock(totalMs)} source="MEASURED" size="lg" />
        <MetricStat label="Words captioned" value={formatNum(totalWords)} source="MEASURED" size="lg" />
        <MetricStat
          label="Best WER"
          value={best ? formatPct(best.wer, 2) : null}
          source={best?.source ?? 'NOT_MEASURED'}
          size="lg"
          detail={best ? `${best.code} · ${best.model}` : 'Run an evaluation to populate.'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Speaking rate across sessions"
          description={avgWpm === null ? 'No sessions yet.' : `Average ${Math.round(avgWpm)} words per minute.`}
        >
          {trend.length < 2 ? (
            <p className="flex h-56 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              Record at least two sessions to see a trend.
            </p>
          ) : (
            <div className="h-56" role="img" aria-label={`Words per minute for the last ${trend.length} sessions`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="wpmFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--foreground)' }}
                  />
                  <Area type="monotone" dataKey="wpm" name="WPM" stroke="var(--chart-1)" strokeWidth={2} fill="url(#wpmFill)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Quick actions">
          <ul className="flex flex-col gap-2">
            {QUICK.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex items-center gap-3 rounded-xl border bg-background/40 px-4 py-3 text-sm transition-colors hover:border-caption/50 hover:bg-muted/40"
                >
                  <Icon className="size-4 text-caption" aria-hidden />
                  {label}
                  <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        title="Recent sessions"
        actions={
          sessions.length > 0 ? (
            <Link href="/transcripts" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              View all
            </Link>
          ) : null
        }
      >
        {sessions.length === 0 ? (
          <EmptyState
            icon={<AudioLines className="size-6" aria-hidden />}
            title="Nothing captioned yet"
            description="Try the Demo ASR provider for an instant sample session, or use your microphone with Browser Speech."
            action={
              <Link href="/live" className={buttonVariants()}>
                Open live captions
              </Link>
            }
          />
        ) : (
          <ul className="divide-y">
            {sessions.slice(0, 5).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/transcripts?session=${s.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm hover:text-caption"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{PROVIDER_LABEL[s.provider]}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatClock(s.durationMs)}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{s.wordCount} words</span>
                  <SourceBadge source={s.source} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
