export type MetricSource = 'MEASURED' | 'SIMULATED' | 'IMPORTED' | 'NOT_MEASURED'

export type ProviderId = 'demo' | 'browser' | 'external'

export type ASRStatus =
  | 'idle'
  | 'starting'
  | 'listening'
  | 'paused'
  | 'stopped'
  | 'error'
  | 'unsupported'

export type LanguageCode = 'en-US' | 'hi-IN' | 'te-IN' | 'ta-IN' | 'kn-IN' | 'ml-IN' | 'bn-IN' | 'mr-IN'

export type SupportLevel = 'Supported' | 'Not Supported' | 'Unknown'

export interface CaptionSegment {
  id: string
  text: string
  /** Milliseconds from session start (active time). */
  startMs: number
  endMs: number
  speaker: string | null
  confidence: number | null
  latencyMs: number | null
  rtf: number | null
  /** Provenance of confidence / latency / rtf on this segment. */
  source: MetricSource
}

export interface Session {
  id: string
  name: string
  createdAt: string
  durationMs: number
  provider: ProviderId
  language: LanguageCode
  wordCount: number
  wpm: number | null
  avgConfidence: number | null
  avgLatencyMs: number | null
  source: MetricSource
  segments: CaptionSegment[]
}

export interface Experiment {
  id: string
  code: string
  name: string
  model: string
  dataset: string
  language: string
  hardware: string
  wer: number | null
  cer: number | null
  rtf: number | null
  avgLatencyMs: number | null
  p95LatencyMs: number | null
  notes: string
  date: string
  source: 'MEASURED' | 'IMPORTED'
}

export type CaptionTheme = 'classic' | 'yellow' | 'light'

export interface Settings {
  provider: ProviderId
  language: LanguageCode
  captionSize: number
  captionTheme: CaptionTheme
  backgroundOpacity: number
  autoScroll: boolean
  highContrast: boolean
  reducedMotion: boolean
  speakerLabels: boolean
  demoMode: boolean
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  type: string
  architecture: string
  processingLocation: string
  version: string
  languages: Record<LanguageCode, SupportLevel>
  notes?: string
}
