'use client'

import useSWR from 'swr'

import { Check, HelpCircle, X } from 'lucide-react'

import { Panel } from '@/components/metric'

import { useHydrated } from '@/hooks/use-store'

import { isBrowserSpeechSupported } from '@/lib/asr'

import {
  LANGUAGES,
  MODEL_INFO,
  NOT_PROVIDED,
} from '@/lib/asr/registry'

import { cn } from '@/lib/utils'

import type { SupportLevel } from '@/types'

const fetcher = (url: string) =>
  fetch(url).then(
    (r) =>
      r.json() as Promise<{
        externalConfigured: boolean
        provider: string | null
      }>
  )

const MODELS = [
  MODEL_INFO.demo,
  MODEL_INFO.browser,
  MODEL_INFO.external,
]

function SupportCell({ level }: { level: SupportLevel }) {
  const Icon =
    level === 'Supported'
      ? Check
      : level === 'Not Supported'
        ? X
        : HelpCircle

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        level === 'Supported' && 'text-caption',
        level === 'Not Supported' &&
          'text-muted-foreground',
        level === 'Unknown' && 'text-chart-2'
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {level}
    </span>
  )
}

export function ModelsView() {
  const hydrated = useHydrated()

  const { data: config } = useSWR(
    '/api/asr/config',
    fetcher
  )

  const status = (
    id: string
  ): {
    label: string
    ok: boolean | null
  } => {
    if (id === 'demo') {
      return {
        label: 'Available',
        ok: true,
      }
    }

    if (id === 'browser') {
      if (!hydrated) {
        return {
          label: 'Checking…',
          ok: null,
        }
      }

      return isBrowserSpeechSupported()
        ? {
            label: 'Available in this browser',
            ok: true,
          }
        : {
            label: 'Not supported in this browser',
            ok: false,
          }
    }

    if (id === 'external') {
      if (!config) {
        return {
          label: 'Checking…',
          ok: null,
        }
      }

      return config.externalConfigured
        ? {
            label: 'Configured · Deepgram',
            ok: true,
          }
        : {
            label: 'Not configured',
            ok: false,
          }
    }

    return {
      label: 'Reference only',
      ok: null,
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        {MODELS.map((m) => {
          const s = status(m.id)

          return (
            <Panel
              key={m.id}
              className="gap-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {m.name}
                </h2>

                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
                    s.ok === true &&
                      'border-caption/40 text-caption',
                    s.ok === false &&
                      'border-destructive/40 text-destructive',
                    s.ok === null &&
                      'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              </div>

              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                {(
                  [
                    ['Provider', m.provider],
                    ['Type', m.type],
                    ['Architecture', m.architecture],
                    ['Runs', m.processingLocation],
                    ['Version', m.version],
                  ] as const
                ).map(([k, v]) => (
                  <div
                    key={k}
                    className="contents"
                  >
                    <dt className="text-muted-foreground">
                      {k}
                    </dt>

                    <dd
                      className={cn(
                        v === NOT_PROVIDED &&
                          'italic text-muted-foreground'
                      )}
                    >
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>

              {m.notes ? (
                <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                  {m.notes}
                </p>
              ) : null}
            </Panel>
          )
        })}
      </div>

      <Panel
        title="Language support"
        description="Support shown here reflects the languages configured for this application. Deepgram Nova-3 is the active cloud ASR provider."
      >
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">
              Language support by model
            </caption>

            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th
                  scope="col"
                  className="px-5 py-2 font-medium"
                >
                  Language
                </th>

                {MODELS.map((m) => (
                  <th
                    key={m.id}
                    scope="col"
                    className="px-5 py-2 font-medium"
                  >
                    {m.name}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {LANGUAGES.map((l) => (
                <tr
                  key={l.code}
                  className="border-b last:border-0"
                >
                  <th
                    scope="row"
                    className="px-5 py-2.5 text-left font-normal"
                  >
                    {l.label}{' '}
                    <span
                      className="text-muted-foreground"
                      lang={l.code}
                    >
                      {l.native}
                    </span>
                  </th>

                  {MODELS.map((m) => (
                    <td
                      key={m.id}
                      className="px-5 py-2.5"
                    >
                      <SupportCell
                        level={m.languages[l.code]}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
