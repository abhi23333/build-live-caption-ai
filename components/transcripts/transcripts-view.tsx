'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Calculator, FileText, Pencil, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState, MetricStat, Panel, SourceBadge } from '@/components/metric'
import { CaptionDisplay } from '@/components/captions/caption-display'
import { useHydrated, useSessions, useSettings } from '@/hooks/use-store'
import { exportSession, type ExportFormat } from '@/lib/export'
import { languageLabel, PROVIDER_LABEL } from '@/lib/asr/registry'
import { formatClock, formatMs, formatNum, formatPct } from '@/lib/metrics/stats'
import { deleteSession, renameSession } from '@/lib/storage'
import { cn } from '@/lib/utils'
import type { Session } from '@/types'

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function SessionDetail({ session, onDeleted }: { session: Session; onDeleted: () => void }) {
  const settings = useSettings()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(session.name)

  const commitRename = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== session.name) renameSession(session.id, trimmed.slice(0, 120))
    else setName(session.name)
    setEditing(false)
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                commitRename()
              }}
            >
              <Input
                autoFocus
                aria-label="Session name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitRename}
                className="h-9 text-lg font-semibold"
              />
            </form>
          ) : (
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <span className="truncate">{session.name}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)}>
                <Pencil aria-hidden />
                <span className="sr-only">Rename session</span>
              </Button>
            </h2>
          )}
          <p className="text-sm text-muted-foreground">
            {dateFmt.format(new Date(session.createdAt))} · {PROVIDER_LABEL[session.provider]} · {languageLabel(session.language)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['txt', 'csv', 'json'] as ExportFormat[]).map((f) => (
            <Button key={f} variant="outline" size="sm" onClick={() => exportSession(session, f)}>
              .{f}
            </Button>
          ))}
          <Link href={`/evaluation?session=${session.id}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            <Calculator data-icon="inline-start" aria-hidden />
            Evaluate
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (!confirm(`Delete "${session.name}"? This cannot be undone.`)) return
              deleteSession(session.id)
              toast.success('Session deleted')
              onDeleted()
            }}
          >
            <Trash2 data-icon="inline-start" aria-hidden />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricStat label="Duration" value={formatClock(session.durationMs)} source="MEASURED" size="sm" />
        <MetricStat label="Words" value={formatNum(session.wordCount)} source="MEASURED" size="sm" />
        <MetricStat label="Words / min" value={formatNum(session.wpm)} source="MEASURED" size="sm" />
        <MetricStat
          label={session.source === 'SIMULATED' ? 'Avg latency' : 'Avg confidence'}
          value={session.source === 'SIMULATED' ? formatMs(session.avgLatencyMs) : formatPct(session.avgConfidence)}
          source={session.source}
          size="sm"
        />
      </div>

      <CaptionDisplay
        segments={session.segments}
        interim=""
        fontSize={Math.min(settings.captionSize, 26)}
        theme={settings.captionTheme}
        opacity={settings.backgroundOpacity}
        autoScroll={false}
        speakerLabels={settings.speakerLabels}
        showMeta
        emptyLabel="This session has no finalized captions."
        className="h-[28rem]"
      />
    </div>
  )
}

export function TranscriptsView() {
  const hydrated = useHydrated()
  const sessions = useSessions()
  const router = useRouter()
  const params = useSearchParams()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter(
      (s) => s.name.toLowerCase().includes(q) || s.segments.some((seg) => seg.text.toLowerCase().includes(q)),
    )
  }, [sessions, query])

  const selectedId = params.get('session') ?? filtered[0]?.id ?? null
  const selected = sessions.find((s) => s.id === selectedId) ?? null

  if (!hydrated) return null

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-6" aria-hidden />}
        title="No saved sessions"
        description="Start a captioning session and press Stop — the transcript is saved here automatically."
        action={
          <Link href="/live" className={buttonVariants()}>
            Start captioning
          </Link>
        }
      />
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <Panel className="h-fit p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcripts"
            aria-label="Search transcripts"
            className="pl-8"
          />
        </div>
        <ul className="flex max-h-[32rem] flex-col gap-1 overflow-y-auto" aria-label="Sessions">
          {filtered.length === 0 ? (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">No matches.</li>
          ) : (
            filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => router.replace(`/transcripts?session=${s.id}`, { scroll: false })}
                  aria-current={s.id === selected?.id ? 'true' : undefined}
                  className={cn(
                    'flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60',
                    s.id === selected?.id && 'bg-muted',
                  )}
                >
                  <span className="truncate text-sm font-medium">{s.name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {formatClock(s.durationMs)} · {s.wordCount} words
                    <SourceBadge source={s.source} className="ml-auto" />
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </Panel>
      {selected ? (
        <SessionDetail key={selected.id} session={selected} onDeleted={() => router.replace('/transcripts')} />
      ) : (
        <EmptyState title="Select a session" />
      )}
    </div>
  )
}
