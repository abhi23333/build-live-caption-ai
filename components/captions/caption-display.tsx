'use client'

import { useEffect, useRef } from 'react'
import { formatClock } from '@/lib/metrics/stats'
import { cn } from '@/lib/utils'
import type { CaptionSegment, CaptionTheme } from '@/types'
import { SourceBadge } from '@/components/metric'

const THEME: Record<CaptionTheme, { bg: string; text: string; meta: string }> = {
  classic: { bg: '0 0 0', text: 'text-white', meta: 'text-white/55' },
  yellow: { bg: '0 0 0', text: 'text-caption', meta: 'text-caption/60' },
  light: { bg: '250 248 240', text: 'text-neutral-950', meta: 'text-neutral-600' },
}

interface CaptionDisplayProps {
  segments: CaptionSegment[]
  interim: string
  fontSize: number
  theme: CaptionTheme
  opacity: number
  autoScroll: boolean
  speakerLabels: boolean
  showMeta?: boolean
  emptyLabel?: string
  className?: string
  ref?: React.Ref<HTMLDivElement>
}

export function CaptionDisplay({
  segments,
  interim,
  fontSize,
  theme,
  opacity,
  autoScroll,
  speakerLabels,
  showMeta = true,
  emptyLabel = 'Captions will appear here.',
  className,
  ref,
}: CaptionDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const t = THEME[theme]

  useEffect(() => {
    if (!autoScroll) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [segments.length, interim, autoScroll])

  return (
    <div
      ref={ref}
      className={cn('relative overflow-hidden rounded-2xl border', className)}
      style={{ backgroundColor: `rgb(${t.bg} / ${opacity})` }}
    >
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Live captions"
        tabIndex={0}
        className="flex h-full flex-col gap-5 overflow-y-auto p-5 md:p-8"
      >
        {segments.length === 0 && !interim ? (
          <p className={cn('m-auto text-center text-base', t.meta)}>{emptyLabel}</p>
        ) : null}
        {segments.map((seg) => (
          <article key={seg.id} className="flex flex-col gap-1.5">
            {showMeta ? (
              <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs', t.meta)}>
                <time>{formatClock(seg.startMs)}</time>
                {speakerLabels && seg.speaker ? <span className="font-semibold">{seg.speaker}</span> : null}
                <span>
                  conf {seg.confidence === null ? '—' : `${Math.round(seg.confidence * 100)}%`}
                </span>
                <span>lat {seg.latencyMs === null ? '—' : `${Math.round(seg.latencyMs)} ms`}</span>
                {seg.source !== 'MEASURED' ? <SourceBadge source={seg.source} className="py-0" /> : null}
              </div>
            ) : speakerLabels && seg.speaker ? (
              <span className={cn('text-sm font-semibold', t.meta)}>{seg.speaker}</span>
            ) : null}
            <p className={cn('font-medium leading-snug text-pretty', t.text)} style={{ fontSize }}>
              {seg.text}
            </p>
          </article>
        ))}
        {interim ? (
          <p
            className={cn('caret font-medium leading-snug opacity-70', t.text)}
            style={{ fontSize }}
            aria-hidden="true"
          >
            {interim}
          </p>
        ) : null}
      </div>
    </div>
  )
}
