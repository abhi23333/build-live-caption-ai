'use client'

import useSWR from 'swr'
import { RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { NativeSelect, Panel } from '@/components/metric'
import { ToggleRow } from '@/components/captions/display-settings'
import { useExperiments, useHydrated, useSessions, useSettings } from '@/hooks/use-store'
import { LANGUAGES, PROVIDER_LABEL } from '@/lib/asr/registry'
import { clearAllData, resetSettings, saveSettings, storageUsageBytes } from '@/lib/storage'
import type { LanguageCode, ProviderId } from '@/types'

type Config = { externalConfigured: boolean; provider: string | null; hasApiKey: boolean }
const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<Config>)

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  )
}

export function SettingsView() {
  const hydrated = useHydrated()
  const settings = useSettings()
  const sessions = useSessions()
  const experiments = useExperiments()
  const { data: config } = useSWR('/api/asr/config', fetcher)
  const bytes = hydrated ? storageUsageBytes() : null

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Defaults" description="Used when you open Live Captions.">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Default provider
          <NativeSelect
            value={settings.provider}
            onChange={(e) => saveSettings({ provider: e.target.value as ProviderId })}
          >
            {(Object.keys(PROVIDER_LABEL) as ProviderId[]).map((id) => (
              <option key={id} value={id}>
                {PROVIDER_LABEL[id]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Default language
          <NativeSelect
            value={settings.language}
            onChange={(e) => saveSettings({ language: e.target.value as LanguageCode })}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label} — {l.native}
              </option>
            ))}
          </NativeSelect>
        </label>
        <ToggleRow
          id="settings-demo"
          label="Demo mode"
          description="Fall back to Demo ASR when the microphone or browser speech is unavailable."
          checked={settings.demoMode}
          onChange={(v) => saveSettings({ demoMode: v })}
        />
        <ToggleRow
          id="settings-speakers"
          label="Speaker labels"
          description="Show speaker names when the provider supplies them."
          checked={settings.speakerLabels}
          onChange={(v) => saveSettings({ speakerLabels: v })}
        />
      </Panel>

      <Panel title="External ASR" description="Configured with server environment variables — keys never reach the browser.">
        <div>
          <Row
            label="ASR_ENDPOINT"
            value={config ? (config.externalConfigured ? <span className="text-caption">Set</span> : 'Not set') : '…'}
          />
          <Row label="ASR_PROVIDER" value={config ? (config.provider ?? 'Not set') : '…'} />
          <Row
            label="ASR_API_KEY"
            value={config ? (config.hasApiKey ? <span className="text-caption">Set</span> : 'Not set') : '…'}
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          The endpoint receives raw audio chunks via <code className="font-mono">POST ?language=xx-XX</code> and must
          return <code className="font-mono">{'{ "text": string, "confidence"?: number }'}</code>. Add the variables in
          the Vars section of project settings.
        </p>
      </Panel>

      <Panel title="Local data" description="Everything is stored in this browser's localStorage.">
        <div>
          <Row label="Sessions" value={hydrated ? sessions.length : '…'} />
          <Row label="Experiments" value={hydrated ? experiments.length : '…'} />
          <Row label="Storage used" value={bytes === null ? '…' : `${(bytes / 1024).toFixed(1)} KB`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetSettings()
              toast.success('Settings reset to defaults')
            }}
          >
            <RotateCcw data-icon="inline-start" aria-hidden />
            Reset settings
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!confirm('Delete all sessions, experiments and settings? This cannot be undone.')) return
              clearAllData()
              toast.success('All local data cleared')
            }}
          >
            <Trash2 data-icon="inline-start" aria-hidden />
            Clear all data
          </Button>
        </div>
      </Panel>
    </div>
  )
}
