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
  private chunkTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private events: ProviderEvents) {}

  private setStatus(status: ASRStatus) {
    this.status = status
    this.events.onStatus(status)
  }

  async start({ language }: StartOptions) {
    this.language = language

    console.log('[External ASR] Starting')
    console.log('[External ASR] Language:', this.language)

    const configResponse = await fetch('/api/asr/config', {
      cache: 'no-store',
    })

    const config = configResponse.ok
      ? ((await configResponse.json()) as {
          externalConfigured?: boolean
        })
      : null

    console.log('[External ASR] Config:', config)

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
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (error) {
      console.error('[External ASR] Microphone error:', error)

      throw new ASRError(
        'permission-denied',
        'Microphone permission was denied.'
      )
    }

    console.log('[External ASR] Microphone ready')

    this.setStatus('listening')

    this.recordChunk()
  }

  private getMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(
          '[External ASR] Using MIME type:',
          type
        )

        return type
      }
    }

    console.log(
      '[External ASR] Using browser default MIME type'
    )

    return undefined
  }

  private recordChunk() {
    if (
      !this.stream ||
      this.status !== 'listening'
    ) {
      return
    }

    const mimeType = this.getMimeType()

    let recorder: MediaRecorder

    try {
      recorder = mimeType
        ? new MediaRecorder(
            this.stream,
            {
              mimeType,
            }
          )
        : new MediaRecorder(
            this.stream
          )
    } catch (error) {
      console.error(
        '[External ASR] MediaRecorder creation failed:',
        error
      )

      this.events.onError(
        new ASRError(
          'recognition-failed',
          'Could not create the audio recorder.'
        )
      )

      return
    }

    const parts: Blob[] = []

    recorder.onstart = () => {
      console.log(
        '[External ASR] Recording started'
      )
    }

    recorder.ondataavailable = (
      event: BlobEvent
    ) => {
      if (
        event.data &&
        event.data.size > 0
      ) {
        parts.push(event.data)

        console.log(
          '[External ASR] Audio data:',
          event.data.size,
          event.data.type
        )
      }
    }

    recorder.onerror = (event) => {
      console.error(
        '[External ASR] Recorder error:',
        event
      )
    }

    recorder.onstop = async () => {
      const type =
        recorder.mimeType ||
        mimeType ||
        'audio/webm'

      const blob = new Blob(
        parts,
        {
          type,
        }
      )

      console.log(
        '[External ASR] Chunk ready:',
        blob.size,
        blob.type
      )

      if (blob.size > 0) {
        await this.send(blob)
      } else {
        console.warn(
          '[External ASR] Empty audio chunk'
        )
      }

      if (
        this.status === 'listening'
      ) {
        this.recordChunk()
      }
    }

    this.recorder = recorder

    try {
      recorder.start()
    } catch (error) {
      console.error(
        '[External ASR] Recorder start failed:',
        error
      )

      return
    }

    this.chunkTimer = setTimeout(() => {
      if (
        recorder.state === 'recording'
      ) {
        console.log(
          '[External ASR] Stopping chunk'
        )

        recorder.stop()
      }
    }, CHUNK_MS)
  }

  private async send(blob: Blob) {
    if (!blob.size) {
      return
    }

    const sentAt = performance.now()

    const url =
      `/api/asr/transcribe?language=${encodeURIComponent(
        this.language
      )}`

    console.log(
      '[External ASR] Sending audio'
    )

    console.log(
      '[External ASR] URL:',
      url
    )

    console.log(
      '[External ASR] Size:',
      blob.size
    )

    console.log(
      '[External ASR] Type:',
      blob.type
    )

    try {
      const response = await fetch(
        url,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              blob.type ||
              'application/octet-stream',

            Accept:
              'application/json',
          },

          body: blob,

          cache: 'no-store',
        }
      )

      const responseText =
        await response.text()

      console.log(
        '[External ASR] Server response:',
        response.status,
        responseText
      )

      if (!response.ok) {
        throw new Error(
          `ASR server returned ${response.status}: ${responseText}`
        )
      }

      let data: {
        text?: unknown
        confidence?: unknown
        language?: unknown
        transcript?: unknown
      }

      try {
        data = JSON.parse(
          responseText
        )
      } catch {
        throw new Error(
          `Invalid JSON response from ASR: ${responseText}`
        )
      }

      console.log(
        '[External ASR] Parsed response:',
        data
      )

      const rawText =
        typeof data.text === 'string'
          ? data.text
          : typeof data.transcript === 'string'
            ? data.transcript
            : ''

      const text =
        rawText.trim()

      const latencyMs =
        performance.now() - sentAt

      console.log(
        '[External ASR] Final transcript:',
        JSON.stringify(text)
      )

      console.log(
        '[External ASR] Latency:',
        Math.round(latencyMs),
        'ms'
      )

      if (!text) {
        console.warn(
          '[External ASR] Server returned 200 but no transcript.'
        )

        return
      }

      const confidence =
        typeof data.confidence === 'number'
          ? data.confidence
          : null

      console.log(
        '[External ASR] Sending caption to caption engine:',
        text
      )

      this.events.onFinal({
        text,
        speaker: null,
        confidence,
        latencyMs,
        rtf: latencyMs / CHUNK_MS,
        source: 'MEASURED',
      })

      console.log(
        '[External ASR] Caption delivered successfully'
      )
    } catch (error) {
      console.error(
        '[External ASR] Request failed:',
        error
      )

      this.events.onError(
        new ASRError(
          'recognition-failed',
          `External ASR request failed: ${
            error instanceof Error
              ? error.message
              : 'Unknown error'
          }`
        )
      )
    }
  }

  stop() {
    console.log(
      '[External ASR] Stopping'
    )

    if (this.chunkTimer) {
      clearTimeout(
        this.chunkTimer
      )

      this.chunkTimer = null
    }

    this.setStatus('stopped')

    if (
      this.recorder?.state ===
      'recording'
    ) {
      this.recorder.stop()
    }

    this.stream?.getTracks().forEach(
      (track) => {
        track.stop()
      }
    )

    this.stream = null
    this.recorder = null
  }

  pause() {
    if (
      this.status !== 'listening'
    ) {
      return
    }

    console.log(
      '[External ASR] Pausing'
    )

    if (this.chunkTimer) {
      clearTimeout(
        this.chunkTimer
      )

      this.chunkTimer = null
    }

    this.setStatus('paused')

    if (
      this.recorder?.state ===
      'recording'
    ) {
      this.recorder.stop()
    }
  }

  resume() {
    if (
      this.status !== 'paused'
    ) {
      return
    }

    console.log(
      '[External ASR] Resuming'
    )

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
