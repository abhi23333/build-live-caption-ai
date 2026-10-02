'use client'

import { useEffect, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SourceBadge } from '@/components/metric'
import type { AudioAnalyserApi } from '@/hooks/use-audio-analyser'
import type { ProviderId, ASRStatus } from '@/types'

const MIC_LABEL: Record<AudioAnalyserApi['micState'], string> = {
  inactive: 'Microphone off',
  requesting: 'Requesting microphone…',
  active: 'Microphone live',
  denied: 'Microphone permission denied',
  unavailable: 'Microphone unavailable',
}

export function AudioVisualizer({
  audio,
  providerId,
  status,
}: {
  audio: AudioAnalyserApi
  providerId: ProviderId
  status: ASRStatus
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simulated = providerId === 'demo' && status === 'listening'
  const live = audio.micState === 'active'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    const data = new Uint8Array(1024)
    const color = getComputedStyle(document.documentElement).getPropertyValue('--caption').trim() || '#facc15'
    const draw = (t: number) => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.lineWidth = 2
      ctx.strokeStyle = color
      ctx.beginPath()
      const analyser = audio.analyserRef.current
      if (analyser) {
        analyser.getByteTimeDomainData(data)
        const len = Math.min(analyser.fftSize, data.length)
        for (let i = 0; i < len; i++) {
          const x = (i / (len - 1)) * w
          const y = (data[i] / 255) * h
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
      } else if (simulated) {
        for (let x = 0; x <= w; x += 2) {
          const env = 0.5 + 0.5 * Math.sin(t / 420 + x / 90)
          const y = h / 2 + Math.sin(x / 7 + t / 60) * env * (h / 3) * Math.sin(x / 31 + t / 300)
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
      } else {
        ctx.globalAlpha = 0.35
        ctx.moveTo(0, h / 2)
        ctx.lineTo(w, h / 2)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [audio.analyserRef, simulated, live])

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          {live ? <Mic className="size-4 text-caption" aria-hidden /> : <MicOff className="size-4 text-muted-foreground" aria-hidden />}
          {providerId === 'demo' ? 'Demo audio (no microphone)' : MIC_LABEL[audio.micState]}
        </span>
        <SourceBadge source={live ? 'MEASURED' : simulated ? 'SIMULATED' : 'NOT_MEASURED'} />
      </div>
      <canvas ref={canvasRef} className="h-20 w-full" aria-label="Audio waveform" role="img" />
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">Level</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-label="Audio level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(audio.level * 100)}>
            <div className="h-full bg-caption transition-[width]" style={{ width: `${live ? audio.level * 100 : 0}%` }} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">Voice</span>
          <span className={cn('font-mono', audio.voiceActive ? 'text-caption' : 'text-muted-foreground')}>
            {live ? (audio.voiceActive ? 'Active' : 'Quiet') : '—'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">Silence</span>
          <span className="font-mono text-muted-foreground">{live ? `${(audio.silenceMs / 1000).toFixed(1)} s` : '—'}</span>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Audio analysis runs locally via the Web Audio API and is never uploaded.
      </p>
    </div>
  )
}
