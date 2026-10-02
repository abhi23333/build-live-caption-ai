'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Panel } from '@/components/metric'
import { uid } from '@/lib/metrics/stats'
import { nextExperimentCode, saveExperiment, StorageError } from '@/lib/storage'

type FieldKey = 'model' | 'dataset' | 'language' | 'hardware' | 'wer' | 'cer' | 'rtf' | 'avgLatencyMs' | 'p95LatencyMs'

const FIELDS: { key: FieldKey; label: string; placeholder: string; numeric?: 'pct' | 'num' }[] = [
  { key: 'model', label: 'Model *', placeholder: 'Whisper small' },
  { key: 'dataset', label: 'Dataset *', placeholder: 'LibriSpeech test-clean' },
  { key: 'language', label: 'Language', placeholder: 'English' },
  { key: 'hardware', label: 'Hardware', placeholder: 'RTX 3060 / M2 / CPU' },
  { key: 'wer', label: 'WER (%)', placeholder: '8.4', numeric: 'pct' },
  { key: 'cer', label: 'CER (%)', placeholder: '3.1', numeric: 'pct' },
  { key: 'rtf', label: 'Real-time factor', placeholder: '0.32', numeric: 'num' },
  { key: 'avgLatencyMs', label: 'Avg latency (ms)', placeholder: '420', numeric: 'num' },
  { key: 'p95LatencyMs', label: 'P95 latency (ms)', placeholder: '780', numeric: 'num' },
]

const EMPTY: Record<FieldKey, string> = {
  model: '', dataset: '', language: '', hardware: '', wer: '', cer: '', rtf: '', avgLatencyMs: '', p95LatencyMs: '',
}

function parseNumber(raw: string, kind: 'pct' | 'num'): number | null | 'invalid' {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return 'invalid'
  if (kind === 'pct') return n > 1000 ? 'invalid' : n / 100
  return n
}

export function ExperimentForm() {
  const [values, setValues] = useState(EMPTY)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.model.trim() || !values.dataset.trim()) {
      setError('Model and dataset are required.')
      return
    }
    const nums: Partial<Record<FieldKey, number | null>> = {}
    for (const f of FIELDS) {
      if (!f.numeric) continue
      const parsed = parseNumber(values[f.key], f.numeric)
      if (parsed === 'invalid') {
        setError(`${f.label.replace(' *', '')} must be a non-negative number.`)
        return
      }
      nums[f.key] = parsed
    }
    if (Object.values(nums).every((v) => v === null)) {
      setError('Enter at least one metric (WER, CER, RTF or latency).')
      return
    }
    setError(null)
    try {
      const code = nextExperimentCode()
      saveExperiment({
        id: uid('exp_'),
        code,
        name: `${values.model.trim()} on ${values.dataset.trim()}`,
        model: values.model.trim().slice(0, 120),
        dataset: values.dataset.trim().slice(0, 120),
        language: values.language.trim().slice(0, 60) || 'Not provided',
        hardware: values.hardware.trim().slice(0, 120) || 'Not provided',
        wer: nums.wer ?? null,
        cer: nums.cer ?? null,
        rtf: nums.rtf ?? null,
        avgLatencyMs: nums.avgLatencyMs ?? null,
        p95LatencyMs: nums.p95LatencyMs ?? null,
        notes: notes.trim().slice(0, 1000),
        date: new Date().toISOString(),
        source: 'IMPORTED',
      })
      setValues(EMPTY)
      setNotes('')
      toast.success(`Recorded ${code}`)
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Could not save experiment.')
    }
  }

  return (
    <Panel
      title="Record an experiment"
      description="Enter results from your own benchmark runs. Manually entered values are labelled Imported."
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              {f.label}
              <Input
                value={values[f.key]}
                inputMode={f.numeric ? 'decimal' : undefined}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Notes
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Decoding settings, chunk size, noise conditions…" />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div>
          <Button type="submit" size="lg" className="px-4">
            <Plus data-icon="inline-start" aria-hidden />
            Add experiment
          </Button>
        </div>
      </form>
    </Panel>
  )
}
