'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ASRError, createProvider, type ASRProvider, type FinalResult } from '@/lib/asr'
import { PROVIDER_LABEL } from '@/lib/asr/registry'
import { computeSegmentStats, type SegmentStats, uid } from '@/lib/metrics/stats'
import { saveSession, StorageError } from '@/lib/storage'
import { useAudioAnalyser, type AudioAnalyserApi } from '@/hooks/use-audio-analyser'
import { useSettings } from '@/hooks/use-store'
import type { ASRStatus, CaptionSegment, LanguageCode, MetricSource, ProviderId, Session } from '@/types'

export interface CaptionEngine {
  status: ASRStatus
  providerId: ProviderId
  language: LanguageCode
  segments: CaptionSegment[]
  interim: string
  elapsedMs: number
  error: string | null
  stats: SegmentStats
  sources: {
    base: MetricSource
    confidence: MetricSource
    latency: MetricSource
    rtf: MetricSource
  }
  lastSessionId: string | null
  audio: AudioAnalyserApi
  isActive: boolean
  setProviderId: (id: ProviderId) => void
  setLanguage: (lang: LanguageCode) => void
  start: (override?: ProviderId) => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
  clear: () => void
}

const EngineContext = createContext<CaptionEngine | null>(null)

export function useCaptionEngine() {
  const ctx = useContext(EngineContext)
  if (!ctx) throw new Error('useCaptionEngine must be used inside <CaptionEngineProvider>')
  return ctx
}

export function useOptionalCaptionEngine() {
  return useContext(EngineContext)
}

export function CaptionEngineProvider({ children }: { children: React.ReactNode }) {
  const settings = useSettings()
  const audio = useAudioAnalyser()
  const [status, setStatus] = useState<ASRStatus>('idle')
  const [providerChoice, setProviderChoice] = useState<ProviderId | null>(null)
  const [languageChoice, setLanguageChoice] = useState<LanguageCode | null>(null)
  const [segments, setSegments] = useState<CaptionSegment[]>([])
  const [interim, setInterim] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lastSessionId, setLastSessionId] = useState<string | null>(null)
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(null)

  const providerId: ProviderId = providerChoice ?? (settings.demoMode ? 'demo' : settings.provider)
  const language: LanguageCode = languageChoice ?? settings.language

  const providerRef = useRef<ASRProvider | null>(null)
  const segmentsRef = useRef<CaptionSegment[]>([])
  const accumRef = useRef(0)
  const runningSinceRef = useRef<number | null>(null)
  const utteranceStartRef = useRef<number | null>(null)
  const finalizedRef = useRef(true)
  const sessionMetaRef = useRef<{ provider: ProviderId; language: LanguageCode; createdAt: string } | null>(null)

  const now = () => accumRef.current + (runningSinceRef.current ? performance.now() - runningSinceRef.current : 0)

  useEffect(() => {
    if (status !== 'listening') return
    const t = setInterval(() => setElapsedMs(now()), 250)
    return () => clearInterval(t)
  }, [status])

  const pauseClock = () => {
    if (runningSinceRef.current) {
      accumRef.current += performance.now() - runningSinceRef.current
      runningSinceRef.current = null
    }
    setElapsedMs(accumRef.current)
  }

  const finalize = useCallback(() => {
    if (finalizedRef.current) return
    finalizedRef.current = true
    pauseClock()
    audio.stopMic()
    setInterim('')
    setActiveProvider(null)
    const meta = sessionMetaRef.current
    const segs = segmentsRef.current
    if (!meta || segs.length === 0) {
      toast.info('Session ended with an empty transcript, so nothing was saved.')
      return
    }
    const durationMs = accumRef.current
    const stats = computeSegmentStats(segs, durationMs)
    const session: Session = {
      id: uid('ses_'),
      name: `${PROVIDER_LABEL[meta.provider]} session · ${new Date(meta.createdAt).toLocaleString()}`,
      createdAt: meta.createdAt,
      durationMs,
      provider: meta.provider,
      language: meta.language,
      wordCount: stats.words,
      wpm: stats.wpm,
      avgConfidence: stats.avgConfidence,
      avgLatencyMs: stats.avgLatencyMs,
      source: meta.provider === 'demo' ? 'SIMULATED' : 'MEASURED',
      segments: segs,
    }
    try {
      saveSession(session)
      setLastSessionId(session.id)
      toast.success('Session saved locally', { description: `${stats.words} words · ${segs.length} segments` })
    } catch (err) {
      toast.error(err instanceof StorageError ? err.message : 'Could not save the session.')
    }
  }, [audio])

  const handleFinal = useCallback((r: FinalResult) => {
    const end = now()
    const start = utteranceStartRef.current ?? Math.max(0, end - 1500)
    utteranceStartRef.current = null
    const seg: CaptionSegment = {
      id: uid('seg_'),
      text: r.text,
      startMs: start,
      endMs: end,
      speaker: r.speaker,
      confidence: r.confidence,
      latencyMs: r.latencyMs,
      rtf: r.rtf,
      source: r.source,
    }
    segmentsRef.current = [...segmentsRef.current, seg]
    setSegments(segmentsRef.current)
    setInterim('')
  }, [])

  const start = useCallback(
    async (override?: ProviderId) => {
      if (providerRef.current && ['listening', 'paused', 'starting'].includes(providerRef.current.getStatus())) return
      const pid = override ?? providerId
      if (override) setProviderChoice(override)
      segmentsRef.current = []
      setSegments([])
      setInterim('')
      setError(null)
      accumRef.current = 0
      runningSinceRef.current = null
      utteranceStartRef.current = null
      setElapsedMs(0)

      const provider = createProvider(pid, {
        onInterim: (text) => {
          if (text && utteranceStartRef.current === null) utteranceStartRef.current = now()
          setInterim(text)
        },
        onFinal: handleFinal,
        onStatus: (s) => {
          setStatus(s)
          if (s === 'listening' && runningSinceRef.current === null) runningSinceRef.current = performance.now()
          if (s === 'paused') pauseClock()
        },
        onError: (e) => {
          setError(e.message)
          toast.error(e.message)
          finalize()
        },
        onEnd: () => finalize(),
      })
      providerRef.current = provider
      setActiveProvider(pid)
      sessionMetaRef.current = { provider: pid, language, createdAt: new Date().toISOString() }
      finalizedRef.current = false

      if (pid !== 'demo') void audio.startMic()

      try {
        await provider.start({ language })
      } catch (err) {
        finalizedRef.current = true
        audio.stopMic()
        setActiveProvider(null)
        const message = err instanceof Error ? err.message : 'Could not start captioning.'
        setError(message)
        setStatus(err instanceof ASRError && err.code === 'unsupported' ? 'unsupported' : 'error')
        toast.error(message, pid !== 'demo' ? { action: { label: 'Use Demo Mode', onClick: () => void start('demo') } } : undefined)
      }
    },
    [providerId, language, audio, handleFinal, finalize],
  )

  const pause = useCallback(() => providerRef.current?.pause(), [])
  const resume = useCallback(() => providerRef.current?.resume(), [])
  const stop = useCallback(() => {
    const p = providerRef.current
    if (!p) return
    p.stop()
    finalize()
  }, [finalize])

  const clear = useCallback(() => {
    segmentsRef.current = []
    setSegments([])
    setInterim('')
    setError(null)
    if (!providerRef.current || !['listening', 'paused'].includes(providerRef.current.getStatus())) {
      accumRef.current = 0
      setElapsedMs(0)
      setStatus('idle')
    }
  }, [])

  useEffect(() => () => providerRef.current?.stop(), [])

  const isActive = status === 'listening' || status === 'paused' || status === 'starting'
  const effectiveProvider = activeProvider ?? (segments.length ? (sessionMetaRef.current?.provider ?? providerId) : providerId)

  const stats = useMemo(() => computeSegmentStats(segments, elapsedMs), [segments, elapsedMs])

  const sources = useMemo(() => {
    const hasData = segments.length > 0 || elapsedMs > 0
    const base: MetricSource = !hasData ? 'NOT_MEASURED' : effectiveProvider === 'demo' ? 'SIMULATED' : 'MEASURED'
    const providerSource: MetricSource = effectiveProvider === 'demo' ? 'SIMULATED' : 'MEASURED'
    return {
      base,
      confidence: stats.avgConfidence === null ? 'NOT_MEASURED' : providerSource,
      latency: stats.avgLatencyMs === null ? 'NOT_MEASURED' : providerSource,
      rtf: stats.rtf === null ? 'NOT_MEASURED' : providerSource,
    } satisfies CaptionEngine['sources']
  }, [segments.length, elapsedMs, effectiveProvider, stats])

  const value: CaptionEngine = {
    status,
    providerId: isActive && activeProvider ? activeProvider : providerId,
    language,
    segments,
    interim,
    elapsedMs,
    error,
    stats,
    sources,
    lastSessionId,
    audio,
    isActive,
    setProviderId: setProviderChoice,
    setLanguage: setLanguageChoice,
    start,
    pause,
    resume,
    stop,
    clear,
  }

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>
}
