'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/metric'
import { useSettings } from '@/hooks/use-store'
import { formatClock } from '@/lib/metrics/stats'
import { MODEL_INFO } from '@/lib/asr/registry'
import { useCaptionEngine } from './caption-engine'
import { CaptionDisplay } from './caption-display'
import { CaptionControls, StatusPill } from './caption-controls'
import { AudioVisualizer } from './audio-visualizer'
import { LiveMetrics } from './live-metrics'
import { DisplaySettings } from './display-settings'

function subscribeFullscreen(cb: () => void) {
  document.addEventListener('fullscreenchange', cb)
  return () => document.removeEventListener('fullscreenchange', cb)
}

export function CaptionConsole() {
  const engine = useCaptionEngine()
  const settings = useSettings()
  const displayRef = useRef<HTMLDivElement>(null)
  const [fsError, setFsError] = useState<string | null>(null)
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null,
    () => false,
  )

  const toggleFullscreen = async () => {
    setFsError(null)
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await displayRef.current?.requestFullscreen()
    } catch {
      setFsError('Fullscreen is not available in this frame. Open the app in its own tab.')
    }
  }

  const info = MODEL_INFO[engine.providerId]

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusPill status={engine.status} />
            <span className="font-mono text-sm tabular-nums text-muted-foreground" aria-label="Elapsed time">
              {formatClock(engine.elapsedMs)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{info.name}</span>
            <Button variant="outline" size="sm" onClick={toggleFullscreen} aria-pressed={isFullscreen}>
              {isFullscreen ? <Minimize2 data-icon="inline-start" aria-hidden /> : <Maximize2 data-icon="inline-start" aria-hidden />}
              {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </Button>
          </div>
        </div>
        {fsError ? <p className="text-xs text-destructive">{fsError}</p> : null}
        <CaptionDisplay
          ref={displayRef}
          segments={engine.segments}
          interim={engine.interim}
          fontSize={isFullscreen ? Math.round(settings.captionSize * 1.4) : settings.captionSize}
          theme={settings.captionTheme}
          opacity={settings.backgroundOpacity}
          autoScroll={settings.autoScroll}
          speakerLabels={settings.speakerLabels}
          emptyLabel={
            engine.providerId === 'demo'
              ? 'Press Start to stream the demo lecture.'
              : 'Press Start and allow microphone access to caption live speech.'
          }
          className="h-[52vh] min-h-80 [&:fullscreen]:h-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
        />
        <Panel>
          <CaptionControls engine={engine} />
        </Panel>
      </div>
      <aside className="flex flex-col gap-4" aria-label="Session details">
        <AudioVisualizer audio={engine.audio} providerId={engine.providerId} status={engine.status} />
        <LiveMetrics engine={engine} />
        <Panel title="Display">
          <DisplaySettings settings={settings} />
        </Panel>
      </aside>
    </div>
  )
}
