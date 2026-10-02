'use client'

import { CaptionDisplay } from '@/components/captions/caption-display'
import { DisplaySettings, ToggleRow } from '@/components/captions/display-settings'
import { Panel } from '@/components/metric'
import { useSettings } from '@/hooks/use-store'
import { saveSettings } from '@/lib/storage'
import type { CaptionSegment } from '@/types'

const PREVIEW: CaptionSegment[] = [
  { id: 'p1', text: 'Captions should be readable from the back row of the lecture hall.', startMs: 0, endMs: 4200, speaker: 'Instructor', confidence: null, latencyMs: null, rtf: null, source: 'NOT_MEASURED' },
  { id: 'p2', text: 'Adjust size, colour and background until this sentence is comfortable to read.', startMs: 4200, endMs: 8800, speaker: 'Instructor', confidence: null, latencyMs: null, rtf: null, source: 'NOT_MEASURED' },
]

const PRACTICES = [
  ['Live region', 'Finalized captions are announced politely to screen readers; interim words are not, to avoid noise.'],
  ['Keyboard', 'Every control is reachable by Tab, with a visible focus ring and a skip-to-content link.'],
  ['Contrast', 'All three caption themes exceed WCAG AA contrast. High-contrast mode strengthens borders and text further.'],
  ['Motion', 'Reduced motion disables the pulse indicators and animated audio meter. Your OS preference is respected too.'],
  ['Honest metrics', 'Confidence and latency are never invented. Values a provider does not expose are shown as Not measured.'],
  ['Privacy', 'Sessions stay in this browser. Browser Speech may send audio to the browser vendor — this is stated where you choose it.'],
]

export function AccessibilityView() {
  const settings = useSettings()
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <Panel title="Preview" description="Changes apply instantly and are saved to this browser.">
          <CaptionDisplay
            segments={PREVIEW}
            interim="and interim words appear dimmed while"
            fontSize={settings.captionSize}
            theme={settings.captionTheme}
            opacity={settings.backgroundOpacity}
            autoScroll={false}
            speakerLabels={settings.speakerLabels}
            className="h-72"
          />
        </Panel>
        <Panel title="How LiveCaption AI supports access">
          <dl className="grid gap-4 sm:grid-cols-2">
            {PRACTICES.map(([title, body]) => (
              <div key={title} className="flex flex-col gap-1 rounded-xl border bg-background/40 p-4">
                <dt className="font-medium">{title}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{body}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      <div className="flex flex-col gap-6">
        <Panel title="Interface">
          <ToggleRow
            id="a11y-contrast"
            label="High contrast"
            description="Stronger borders and pure-white text."
            checked={settings.highContrast}
            onChange={(v) => saveSettings({ highContrast: v })}
          />
          <ToggleRow
            id="a11y-motion"
            label="Reduce motion"
            description="Stops pulsing and animated meters."
            checked={settings.reducedMotion}
            onChange={(v) => saveSettings({ reducedMotion: v })}
          />
        </Panel>
        <Panel title="Captions">
          <DisplaySettings settings={settings} />
        </Panel>
      </div>
    </div>
  )
}
