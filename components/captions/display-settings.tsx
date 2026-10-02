'use client'

import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { saveSettings } from '@/lib/storage'
import { cn } from '@/lib/utils'
import type { CaptionTheme, Settings } from '@/types'

const THEMES: { id: CaptionTheme; label: string; swatch: string }[] = [
  { id: 'classic', label: 'White on black', swatch: 'bg-black text-white' },
  { id: 'yellow', label: 'Yellow on black', swatch: 'bg-black text-caption' },
  { id: 'light', label: 'Black on cream', swatch: 'bg-[#faf8f0] text-neutral-950' },
]

const first = (v: number | readonly number[]) => (Array.isArray(v) ? v[0] : (v as number))

export function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="flex flex-col gap-0.5 text-sm">
        <span className="font-medium">{label}</span>
        {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
    </div>
  )
}

export function DisplaySettings({ settings, className }: { settings: Settings; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span id="caption-size-label" className="font-medium">
            Caption size
          </span>
          <span className="font-mono text-xs text-muted-foreground">{settings.captionSize}px</span>
        </div>
        <Slider
          aria-labelledby="caption-size-label"
          min={18}
          max={72}
          step={2}
          value={settings.captionSize}
          onValueChange={(v) => saveSettings({ captionSize: first(v) })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span id="caption-opacity-label" className="font-medium">
            Background opacity
          </span>
          <span className="font-mono text-xs text-muted-foreground">{Math.round(settings.backgroundOpacity * 100)}%</span>
        </div>
        <Slider
          aria-labelledby="caption-opacity-label"
          min={0.3}
          max={1}
          step={0.05}
          value={settings.backgroundOpacity}
          onValueChange={(v) => saveSettings({ backgroundOpacity: first(v) })}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Caption theme</legend>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <label
              key={t.id}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-2 text-center text-[11px] has-checked:border-caption has-focus-visible:ring-2 has-focus-visible:ring-ring',
              )}
            >
              <input
                type="radio"
                name="caption-theme"
                value={t.id}
                checked={settings.captionTheme === t.id}
                onChange={() => saveSettings({ captionTheme: t.id })}
                className="sr-only"
              />
              <span className={cn('flex h-8 w-full items-center justify-center rounded font-semibold', t.swatch)}>Aa</span>
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <ToggleRow
        id="toggle-autoscroll"
        label="Auto-scroll"
        checked={settings.autoScroll}
        onChange={(v) => saveSettings({ autoScroll: v })}
      />
      <ToggleRow
        id="toggle-speakers"
        label="Speaker labels"
        description="Shown only when the provider returns speakers"
        checked={settings.speakerLabels}
        onChange={(v) => saveSettings({ speakerLabels: v })}
      />
      <ToggleRow
        id="toggle-contrast"
        label="High contrast"
        checked={settings.highContrast}
        onChange={(v) => saveSettings({ highContrast: v })}
      />
    </div>
  )
}
