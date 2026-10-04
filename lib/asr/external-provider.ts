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

  private timer: ReturnType<typeof setTimeout> | null = null

  private language = 'en-US'

  constructor(private events: ProviderEvents) {}

  private setStatus(status: ASRStatus) {
    this.status = status

    console.log(
      '[Deepgram] Status:',
      status
    )

    this.events.onStatus(status)
  }

  async start({ language }: StartOptions) {
    this.language = language

    console.log(
      '[Deepgram] Starting'
    )

    console.log(
      '[Deepgram] Language:',
      this.language
    )

    try {
      const configResponse =
        await fetch('/api/asr/config', {
          cache: 'no-store',
        })

      const config =
        await configResponse.json()

      console.log(
        '[Deepgram] Config:',
        config
      )

      if (!config?.externalConfigured) {
        throw new Error(
          'Deepgram is not configured.'
        )
      }

      if (
        typeof MediaRecorder ===
          'undefined' ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new ASRError(
          'unsupported',
          'Audio recording is not supported.'
        )
      }

      this.stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })

      console.log(
        '[Deepgram] Microphone ready'
      )

      this.setStatus('listening')

      this.recordChunk()
    } catch (error) {
      console.error(
        '[Deepgram] Start error:',
        error
      )

      this.cleanup()

      if (error instanceof ASRError) {
        throw error
      }

      throw new ASRError(
        'recognition-failed',
        error instanceof Error
          ? error.message
          : 'Failed to start Deepgram ASR.'
      )
    }
  }

  private getMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
    ]

    for (const type of types) {
      if (
        MediaRecorder.isTypeSupported(type)
      ) {
        console.log(
          '[Deepgram] MIME:',
          type
        )

        return type
      }
    }

    return undefined
  }

  private recordChunk() {
    if (
      !this.stream ||
      this.status !== 'listening'
    ) {
      return
    }

    const mimeType =
      this.getMimeType()

    let recorder: MediaRecorder

    try {
      recorder = mimeType
        ? new MediaRecorder(
            this.stream,
            { mimeType }
          )
        : new MediaRecorder(
            this.stream
          )
    } catch (error) {
      console.error(
        '[Deepgram] Recorder error:',
        error
      )

      this.events.onError(
        new ASRError(
          'recognition-failed',
          'Could not create audio recorder.'
        )
      )

      return
    }

    const parts: Blob[] = []

    recorder.onstart = () => {
      console.log(
        '[Deepgram] Recording started'
      )
    }

    recorder.ondataavailable = (
      event
    ) => {
      if (
        event.data &&
        event.data.size > 0
      ) {
        parts.push(event.data)

        console.log(
          '[Deepgram] Audio:',
          event.data.size,
          event.data.type
        )
      }
    }

    recorder.onerror = (event) => {
      console.error(
        '[Deepgram] Recorder error:',
        event
      )
    }

    recorder.onstop = () => {
      const type =
        recorder.mimeType ||
        mimeType ||
        'audio/webm'

      const blob =
        new Blob(parts, { type })

      console.log(
        '[Deepgram] Chunk ready:',
        blob.size,
        blob.type
      )

      if (blob.size > 0) {
        void this.send(blob)
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
        '[Deepgram] Recorder start failed:',
        error
      )

      return
    }

    this.timer =
      setTimeout(() => {
        if (
          recorder.state ===
          'recording'
        ) {
          recorder.stop()
        }
      }, CHUNK_MS)
  }

  private async send(
    blob: Blob
  ) {
    const sentAt =
      performance.now()

    console.log(
      '[Deepgram] Sending:',
      blob.size,
      blob.type
    )

    try {
      const url =
        `/api/deepgram?language=${encodeURIComponent(
          this.language
        )}`

      const response =
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type':
              blob.type ||
              'audio/webm',
            Accept:
              'application/json',
          },
          body: blob,
          cache: 'no-store',
        })

      const responseText =
        await response.text()

      console.log(
        '[Deepgram] Response:',
        response.status,
        responseText
      )

      if (!response.ok) {
        throw new Error(
          `Deepgram returned ${response.status}: ${responseText}`
        )
      }

      let data: {
        text?: unknown
        confidence?: unknown
        language?: unknown
      }

      try {
        data =
          JSON.parse(
            responseText
          )
      } catch {
        throw new Error(
          'Invalid JSON from Deepgram.'
        )
      }

      const text =
        typeof data.text ===
        'string'
          ? data.text.trim()
          : ''

      if (!text) {
        console.log(
          '[Deepgram] Empty transcript'
        )

        return
      }

      const latencyMs =
        performance.now() -
        sentAt

      const confidence =
        typeof data.confidence ===
        'number'
          ? data.confidence
          : null

      console.log(
        '[Deepgram] FINAL:',
        text
      )

      this.events.onFinal({
        text,
        speaker: null,
        confidence,
        latencyMs,
        rtf:
          latencyMs / CHUNK_MS,
        source: 'MEASURED',
      })
    } catch (error) {
      console.error(
        '[Deepgram] Request failed:',
        error
      )

      this.events.onError(
        new ASRError(
          'recognition-failed',
          error instanceof Error
            ? error.message
            : 'Deepgram request failed.'
        )
      )
    }
  }

  stop() {
    console.log(
      '[Deepgram] Stopping'
    )

    this.setStatus('stopped')

    this.cleanup()
  }

  pause() {
    if (
      this.status !== 'listening'
    ) {
      return
    }

    console.log(
      '[Deepgram] Pausing'
    )

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (
      this.recorder?.state ===
      'recording'
    ) {
      this.recorder.stop()
    }

    this.setStatus('paused')
  }

  resume() {
    if (
      this.status !== 'paused'
    ) {
      return
    }

    console.log(
      '[Deepgram] Resuming'
    )

    this.setStatus('listening')

    this.recordChunk()
  }

  private cleanup() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (
      this.recorder?.state ===
      'recording'
    ) {
      this.recorder.stop()
    }

    this.recorder = null

    if (this.stream) {
      this.stream
        .getTracks()
        .forEach(
          (track) => track.stop()
        )

      this.stream = null
    }
  }

  getStatus() {
    return this.status
  }

  getModelInfo() {
    return {
      ...MODEL_INFO.external,
      name: 'Deepgram Nova-3',
      provider: 'Deepgram',
      type: 'Cloud speech-to-text',
      architecture:
        'Deepgram Nova-3',
      processingLocation:
        'Deepgram Cloud',
      version: 'Nova-3',
      notes:
        'Chunked audio transcription using the Deepgram Nova-3 speech recognition model.',
    }
  }
}
