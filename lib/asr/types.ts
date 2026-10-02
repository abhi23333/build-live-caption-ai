import type { ASRStatus, LanguageCode, MetricSource, ModelInfo, ProviderId } from '@/types'

export type ASRErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'no-microphone'
  | 'network'
  | 'language-not-supported'
  | 'not-configured'
  | 'recognition-failed'

export class ASRError extends Error {
  constructor(
    public code: ASRErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export interface FinalResult {
  text: string
  speaker: string | null
  confidence: number | null
  latencyMs: number | null
  rtf: number | null
  source: MetricSource
}

export interface ProviderEvents {
  onInterim: (text: string) => void
  onFinal: (result: FinalResult) => void
  onStatus: (status: ASRStatus) => void
  onError: (error: ASRError) => void
  /** Provider reached a natural end (e.g. demo script finished). */
  onEnd: () => void
}

export interface StartOptions {
  language: LanguageCode
}

export interface ASRProvider {
  readonly id: ProviderId
  start(options: StartOptions): Promise<void>
  stop(): void
  pause(): void
  resume(): void
  getStatus(): ASRStatus
  getModelInfo(): ModelInfo
}
