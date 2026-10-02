import type { ASRStatus } from '@/types'
import { MODEL_INFO } from './registry'
import { ASRError, type ASRProvider, type ProviderEvents, type StartOptions } from './types'

const CHUNK_MS = 4000

/**
 * Integration-ready provider: records short audio chunks with MediaRecorder and
 * POSTs them to /api/asr/transcribe, which proxies to the server-configured
 * ASR_ENDPOINT (e.g. a self-hosted Whisper service). Latency and RTF are
 * measured from the real round trip.
 */
export class ExternalASRProvider implements ASRProvider {
  readonly id = 'external' as const
  private status: ASRStatus = 'idle'
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private language = 'en-US'

  constructor(private events: ProviderEvents) {}

  private setStatus(s: ASRStatus) {
    this.status = s
    this.events.onStatus(s)
  }

  async start({ language }: StartOptions) {
    this.language = language
    const res = await fetch('/api/asr/config').catch(() => null)
    const config = res?.ok ? ((await res.json()) as { externalConfigured: boolean }) : null
    if (!config?.externalConfigured) {
      throw new ASRError(
        'not-configured',
        'External ASR is not configured. Set ASR_ENDPOINT (and optionally ASR_API_KEY) on the server.',
      )
    }
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new ASRError('unsupported', 'MediaRecorder is not available in this browser.')
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      throw new ASRError('permission-denied', 'Microphone permission was denied.')
    }
    this.setStatus('listening')
    this.recordChunk()
  }

  private recordChunk() {
    if (!this.stream || this.status !== 'listening') return
    const recorder = new MediaRecorder(this.stream)
    const parts: Blob[] = []
    recorder.ondataavailable = (e) => e.data.size && parts.push(e.data)
    recorder.onstop = () => {
      const blob = new Blob(parts, { type: recorder.mimeType })
      void this.send(blob)
      if (this.status === 'listening') this.recordChunk()
    }
    this.recorder = recorder
    recorder.start()
    setTimeout(() => recorder.state === 'recording' && recorder.stop(), CHUNK_MS)
  }

  private async send(blob: Blob) {
    if (blob.size === 0) return
    const sentAt = performance.now()
    try {
      const res = await fetch(`/api/asr/transcribe?language=${encodeURIComponent(this.language)}`, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'application/octet-stream' },
        body: blob,
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as { text?: string; confidence?: number }
      const latencyMs = performance.now() - sentAt
      const text = data.text?.trim()
      if (text) {
        this.events.onFinal({
          text,
          speaker: null,
          confidence: typeof data.confidence === 'number' ? data.confidence : null,
          latencyMs,
          rtf: latencyMs / CHUNK_MS,
          source: 'MEASURED',
        })
      }
    } catch (err) {
      this.events.onError(
        new ASRError('recognition-failed', `External ASR request failed: ${err instanceof Error ? err.message : 'unknown error'}`),
      )
    }
  }

  stop() {
    this.setStatus('stopped')
    this.recorder?.state === 'recording' && this.recorder.stop()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }

  pause() {
    if (this.status !== 'listening') return
    this.setStatus('paused')
    this.recorder?.state === 'recording' && this.recorder.stop()
  }

  resume() {
    if (this.status !== 'paused') return
    this.setStatus('listening')
    this.recordChunk()
  }

  getStatus() {
    return this.status
  }

  getModelInfo() {
    return MODEL_INFO.external
  }
}
