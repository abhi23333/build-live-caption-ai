'use client'

import Link from 'next/link'
import { Pause, Play, Square, Trash2, FileText } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { NativeSelect } from '@/components/metric'
import { LANGUAGES, MODEL_INFO, PROVIDER_LABEL } from '@/lib/asr/registry'
import { cn } from '@/lib/utils'
import type { ASRStatus, LanguageCode, ProviderId } from '@/types'
import type { CaptionEngine } from './caption-engine'

const STATUS_LABEL: Record<ASRStatus, string> = {
  idle: 'Ready',
  starting: 'Starting',
  listening: 'Listening',
  paused: 'Paused',
  stopped: 'Stopped',
  error: 'Error',
  unsupported: 'Unsupported',
}

export function StatusPill({ status }: { status: ASRStatus }) {
  const live = status === 'listening'
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wider',
        live && 'border-live/50 text-live',
        status === 'paused' && 'border-caption/50 text-caption',
        (status === 'error' || status === 'unsupported') && 'border-destructive/50 text-destructive',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full bg-muted-foreground',
          live && 'pulse-dot bg-live',
          status === 'paused' && 'bg-caption',
          (status === 'error' || status === 'unsupported') && 'bg-destructive',
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function CaptionControls({ engine }: { engine: CaptionEngine }) {
  const { status, providerId, language, isActive, segments, lastSessionId } = engine
  const info = MODEL_INFO[providerId]
  const support = info.languages[language]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          ASR provider
          <NativeSelect
            value={providerId}
            disabled={isActive}
            onChange={(e) => engine.setProviderId(e.target.value as ProviderId)}
          >
            {(Object.keys(PROVIDER_LABEL) as ProviderId[]).map((id) => (
              <option key={id} value={id}>
                {PROVIDER_LABEL[id]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="flex items-center justify-between">
            Language
            <span
              className={cn(
                'font-mono text-[10px] uppercase',
                support === 'Supported' && 'text-caption',
                support === 'Not Supported' && 'text-destructive',
              )}
            >
              {support}
            </span>
          </span>
          <NativeSelect
            value={language}
            disabled={isActive}
            onChange={(e) => engine.setLanguage(e.target.value as LanguageCode)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label} · {l.native}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isActive ? (
          <Button size="lg" className="px-4" onClick={() => void engine.start()}>
            <Play data-icon="inline-start" aria-hidden />
            Start captions
          </Button>
        ) : status === 'paused' ? (
          <Button size="lg" className="px-4" onClick={engine.resume}>
            <Play data-icon="inline-start" aria-hidden />
            Resume
          </Button>
        ) : (
          <Button size="lg" variant="secondary" className="px-4" onClick={engine.pause} disabled={status !== 'listening'}>
            <Pause data-icon="inline-start" aria-hidden />
            Pause
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={engine.stop} disabled={!isActive}>
          <Square data-icon="inline-start" aria-hidden />
          Stop
        </Button>
        <Button size="lg" variant="ghost" onClick={engine.clear} disabled={segments.length === 0}>
          <Trash2 data-icon="inline-start" aria-hidden />
          Clear
        </Button>
        {lastSessionId && !isActive ? (
          <Link href={`/transcripts?session=${lastSessionId}`} className={buttonVariants({ variant: 'link', size: 'lg' })}>
            <FileText data-icon="inline-start" aria-hidden />
            Open saved transcript
          </Link>
        ) : null}
      </div>
      {engine.error ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {engine.error}
        </p>
      ) : null}
    </div>
  )
}
