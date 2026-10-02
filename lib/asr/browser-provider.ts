import type { ASRStatus } from '@/types'
import { MODEL_INFO } from './registry'
import { ASRError, type ASRProvider, type ProviderEvents, type StartOptions } from './types'

interface SpeechRecognitionAlternativeLike {
  transcript: string
  confidence: number
}
interface SpeechRecognitionResultLike {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: { length: number; [index: number]: SpeechRecognitionResultLike }
}
interface SpeechRecognitionErrorEventLike {
  error: string
  message?: string
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const isBrowserSpeechSupported = () => getSpeechRecognitionCtor() !== null

export class BrowserSpeechProvider implements ASRProvider {
  readonly id = 'browser' as const
  private status: ASRStatus = 'idle'
  private recognition: SpeechRecognitionLike | null = null
  private wantRunning = false

  constructor(private events: ProviderEvents) {}

  private setStatus(s: ASRStatus) {
    this.status = s
    this.events.onStatus(s)
  }

  async start({ language }: StartOptions) {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      this.setStatus('unsupported')
      throw new ASRError(
        'unsupported',
        'This browser does not implement the Web Speech API (SpeechRecognition). Try Chrome or Edge on desktop, or use Demo Mode.',
      )
    }
    const rec = new Ctor()
    rec.lang = language
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onresult = (e) => this.handleResult(e)
    rec.onerror = (e) => this.handleError(e)
    rec.onend = () => {
      // Chrome ends recognition after silence; restart while the session is active.
      if (this.wantRunning && this.status === 'listening') {
        try {
          rec.start()
        } catch {
          /* already started */
        }
      }
    }
    this.recognition = rec
    this.wantRunning = true
    this.setStatus('starting')
    try {
      rec.start()
      this.setStatus('listening')
    } catch {
      throw new ASRError('recognition-failed', 'Speech recognition could not start.')
    }
  }

  private handleResult(e: SpeechRecognitionEventLike) {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i]
      const alt = result[0]
      if (!alt) continue
      if (result.isFinal) {
        const text = alt.transcript.trim()
        if (text) {
          this.events.onFinal({
            text,
            speaker: null,
            // Some engines report 0 when no confidence is available.
            confidence: alt.confidence > 0 ? alt.confidence : null,
            latencyMs: null,
            rtf: null,
            source: 'MEASURED',
          })
        }
      } else {
        interim += alt.transcript
      }
    }
    this.events.onInterim(interim.trim())
  }

  private handleError(e: SpeechRecognitionErrorEventLike) {
    if (e.error === 'no-speech' || e.error === 'aborted') return
    const map: Record<string, ASRError> = {
      'not-allowed': new ASRError('permission-denied', 'Microphone permission was denied. Allow microphone access in your browser settings.'),
      'service-not-allowed': new ASRError('permission-denied', 'The browser blocked the speech recognition service.'),
      'audio-capture': new ASRError('no-microphone', 'No microphone was found or it is in use by another app.'),
      network: new ASRError('network', 'Speech recognition needs a network connection in this browser.'),
      'language-not-supported': new ASRError('language-not-supported', 'This browser does not support recognition for the selected language.'),
    }
    this.wantRunning = false
    this.setStatus('error')
    this.events.onError(map[e.error] ?? new ASRError('recognition-failed', `Recognition failed: ${e.error}`))
  }

  stop() {
    this.wantRunning = false
    this.recognition?.stop()
    this.recognition = null
    this.setStatus('stopped')
  }

  pause() {
    if (this.status !== 'listening') return
    this.wantRunning = false
    this.setStatus('paused')
    this.recognition?.stop()
  }

  resume() {
    if (this.status !== 'paused' || !this.recognition) return
    this.wantRunning = true
    this.setStatus('listening')
    try {
      this.recognition.start()
    } catch {
      /* already started */
    }
  }

  getStatus() {
    return this.status
  }

  getModelInfo() {
    return MODEL_INFO.browser
  }
}
