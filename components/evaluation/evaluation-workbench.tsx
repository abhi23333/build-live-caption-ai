'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calculator, FlaskConical, Upload, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MetricStat, Panel } from '@/components/metric'
import { DEMO_SCRIPT } from '@/lib/asr/demo-provider'
import { computeCER, computeWER, validateEvaluationInput, type AlignOp } from '@/lib/metrics/wer'
import { formatPct, uid } from '@/lib/metrics/stats'
import { getSession, nextExperimentCode, saveExperiment, StorageError } from '@/lib/storage'
import { cn } from '@/lib/utils'

const SAMPLE_REFERENCE = DEMO_SCRIPT.slice(0, 4)
  .map((s) => s.text)
  .join(' ')
const SAMPLE_PREDICTION =
  'Good morning every one. Today we going to explore the fundamental of machine learning. A machine learning model learns pattern from the data instead of following handwritten rules. Let us start with simple question what is a neural network'

type Result = { wer: ReturnType<typeof computeWER>; cer: ReturnType<typeof computeCER> }

function AlignmentView({ ops }: { ops: AlignOp<string>[] }) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-label="Legend">
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-foreground/20" aria-hidden />Correct</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-caption" aria-hidden />Substitution</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-destructive" aria-hidden />Deletion</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-chart-2" aria-hidden />Insertion</li>
      </ul>
      <p className="flex flex-wrap gap-x-1.5 gap-y-2 font-mono text-sm leading-relaxed">
        {ops.map((op, i) => {
          if (op.type === 'correct') return <span key={i}>{op.ref}</span>
          if (op.type === 'substitution')
            return (
              <span key={i} className="rounded bg-caption/15 px-1 text-caption">
                <s className="opacity-60">{op.ref}</s> → {op.hyp}
                <span className="sr-only"> (substitution)</span>
              </span>
            )
          if (op.type === 'deletion')
            return (
              <span key={i} className="rounded bg-destructive/15 px-1 text-destructive line-through">
                {op.ref}
                <span className="sr-only"> (deleted)</span>
              </span>
            )
          return (
            <span key={i} className="rounded bg-chart-2/15 px-1 text-chart-2 underline">
              +{op.hyp}
              <span className="sr-only"> (inserted)</span>
            </span>
          )
        })}
      </p>
    </div>
  )
}

function readTextFile(file: File, onLoad: (text: string) => void) {
  if (file.size > 2 * 1024 * 1024) {
    toast.error('File is larger than 2 MB.')
    return
  }
  file
    .text()
    .then(onLoad)
    .catch(() => toast.error('Could not read the file.'))
}

export function EvaluationWorkbench() {
  const params = useSearchParams()
  const sessionId = params.get('session')
  const prefill = useMemo(() => {
    if (!sessionId) return ''
    const s = getSession(sessionId)
    return s ? s.segments.map((seg) => seg.text).join(' ') : ''
  }, [sessionId])

  const [reference, setReference] = useState('')
  const [prediction, setPrediction] = useState(prefill)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState('')
  const [dataset, setDataset] = useState('')
  const [language, setLanguage] = useState('English')

  const evaluate = () => {
    const check = validateEvaluationInput(reference, prediction)
    if (!check.ok) {
      setError(check.error)
      setResult(null)
      return
    }
    setError(null)
    setResult({ wer: computeWER(reference, prediction), cer: computeCER(reference, prediction) })
  }

  const saveAsExperiment = () => {
    if (!result) return
    if (!model.trim() || !dataset.trim()) {
      toast.error('Model and dataset names are required.')
      return
    }
    try {
      const code = nextExperimentCode()
      saveExperiment({
        id: uid('exp_'),
        code,
        name: `${model.trim()} on ${dataset.trim()}`,
        model: model.trim(),
        dataset: dataset.trim(),
        language: language.trim() || 'Unknown',
        hardware: 'Not provided',
        wer: result.wer.rate,
        cer: result.cer.rate,
        rtf: null,
        avgLatencyMs: null,
        p95LatencyMs: null,
        notes: `WER computed in-app from ${result.wer.referenceLength} reference words.`,
        date: new Date().toISOString(),
        source: 'MEASURED',
      })
      toast.success(`Saved as ${code}`)
    } catch (err) {
      toast.error(err instanceof StorageError ? err.message : 'Could not save experiment.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {(
          [
            { id: 'reference', label: 'Reference transcript', hint: 'Ground truth — what was actually said.', value: reference, set: setReference },
            { id: 'prediction', label: 'ASR prediction', hint: 'Model output to evaluate.', value: prediction, set: setPrediction },
          ] as const
        ).map((f) => (
          <Panel
            key={f.id}
            title={f.label}
            description={f.hint}
            actions={
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
                <Upload className="size-3.5" aria-hidden />
                Upload .txt
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) readTextFile(file, f.set)
                    e.target.value = ''
                  }}
                />
              </label>
            }
          >
            <Textarea
              id={f.id}
              aria-label={f.label}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              placeholder="Paste text…"
              className="min-h-40 font-mono text-sm"
            />
          </Panel>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" className="px-4" onClick={evaluate}>
          <Calculator data-icon="inline-start" aria-hidden />
          Compute WER & CER
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => {
            setReference(SAMPLE_REFERENCE)
            setPrediction(SAMPLE_PREDICTION)
            setResult(null)
            setError(null)
          }}
        >
          <Wand2 data-icon="inline-start" aria-hidden />
          Load sample
        </Button>
        <span className="text-xs text-muted-foreground">
          Text is lower-cased, punctuation is stripped and whitespace is collapsed before alignment.
        </span>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-4" aria-live="polite">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricStat label="WER" value={formatPct(result.wer.rate, 2)} source="MEASURED" size="lg" />
            <MetricStat label="CER" value={formatPct(result.cer.rate, 2)} source="MEASURED" size="lg" />
            <MetricStat
              label="Word accuracy"
              value={formatPct(Math.max(0, 1 - result.wer.rate), 2)}
              source="MEASURED"
              size="lg"
            />
            <MetricStat
              label="Words (ref / hyp)"
              value={`${result.wer.referenceLength} / ${result.wer.hypothesisLength}`}
              source="MEASURED"
              size="lg"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['Substitutions', result.wer.substitutions, 'text-caption'],
                ['Deletions', result.wer.deletions, 'text-destructive'],
                ['Insertions', result.wer.insertions, 'text-chart-2'],
              ] as const
            ).map(([label, n, color]) => (
              <div key={label} className="flex flex-col gap-1 rounded-xl border bg-card/60 p-4">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className={cn('font-mono text-2xl tabular-nums', color)}>{n}</span>
              </div>
            ))}
          </div>
          <Panel
            title="Word alignment"
            description={`WER = (S + D + I) / N = (${result.wer.substitutions} + ${result.wer.deletions} + ${result.wer.insertions}) / ${result.wer.referenceLength}`}
          >
            <AlignmentView ops={result.wer.ops} />
          </Panel>
          <Panel title="Save as experiment" description="Records this WER/CER in the experiment tracker as a measured result.">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Model
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Whisper small" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Dataset
                <Input value={dataset} onChange={(e) => setDataset(e.target.value)} placeholder="e.g. Lecture set A" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Language
                <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
              </label>
              <Button size="lg" variant="secondary" onClick={saveAsExperiment}>
                <FlaskConical data-icon="inline-start" aria-hidden />
                Save
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
