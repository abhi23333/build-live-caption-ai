import type { ASRStatus } from '@/types'
import { MODEL_INFO } from './registry'
import {
  ASRError,
  type ASRProvider,
  type ProviderEvents,
  type StartOptions,
} from './types'

const CHUNK_MS = 4000

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

    const res = await fetch('/api/asr/config')
    const config = res.ok
      ? ((await res.json()) as { externalConfigured: boolean })
      : null

    if (!config?.externalConfigured) {
      throw new ASRError(
        'not-configured',
        'External ASR is not configured.'
      )
    }

    if (
      typeof MediaRecorder === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new ASRError(
        'unsupported',
        'MediaRecorder is not available in this browser.'
      )
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
    } catch {
      throw new ASRError(
        'permission-denied',
        'Microphone permission was denied.'
      )
    }

    this.setStatus('listening')
    this.recordChunk()
  }

  private recordChunk() {
    if (!this.stream || this.status !== 'listening') return

    const recorder = new MediaRecorder(this.stream)
    const parts: Blob[] = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        parts.push(e.data)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(parts, {
        type: recorder.mimeType,
      })

      console.log(
        '[External ASR] Audio chunk:',
        blob.size,
        blob.type
      )

      void this.send(blob)

      if (this.status === 'listening') {
        this.recordChunk()
      }
    }

    this.recorder = recorder

    recorder.start()

    setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop()
      }
    }, CHUNK_MS)
  }

  private async send(blob: Blob) {
    if (blob.size === 0) return

    const sentAt = performance.now()

    try {
      const url =
        `/api/asr/transcribe?language=${encodeURIComponent(
          this.language
        )}`

      console.log('[External ASR] Sending:', url)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type':
            blob.type || 'application/octet-stream',
        },
        body: blob,
      })

      const responseText = await res.text()

      console.log(
        '[External ASR] Response:',
        res.status,
        responseText
      )

      if (!res.ok) {
        throw new Error(responseText)
      }

      let data: {
        text?: string
        confidence?: number
        language?: string
      }

      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error(
          `Invalid ASR response: ${responseText}`
        )
      }

      const latencyMs = performance.now() - sentAt
      const text = data.text?.trim()

      console.log('[External ASR] Transcript:', text)

      if (!text) {
        return
      }

      this.events.onFinal({
        text,
        speaker: null,
        confidence:
          typeof data.confidence === 'number'
            ? data.confidence
            : null,
        latencyMs,
        rtf: latencyMs / CHUNK_MS,
        source: 'MEASURED',
      })
    } catch (err) {
      console.error('[External ASR] Error:', err)

      this.events.onError(
        new ASRError(
          'recognition-failed',
          `External ASR request failed: ${
            err instanceof Error
              ? err.message
              : 'unknown error'
          }`
        )
      )
    }
  }

  stop() {
    this.setStatus('stopped')

    if (this.recorder?.state === 'recording') {
      this.recorder.stop()
    }

    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.recorder = null
  }

  pause() {
    if (this.status !== 'listening') return

    this.setStatus('paused')

    if (this.recorder?.state === 'recording') {
      this.recorder.stop()
    }
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
