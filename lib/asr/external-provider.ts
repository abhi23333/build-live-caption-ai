import type { ASRStatus } from '@/types'

export interface ExternalASRProviderOptions {
  endpoint: string
  apiKey?: string
  language?: string
}

export class ExternalASRProvider {

  readonly id = 'external' as const

  private status: ASRStatus = 'idle'

  private stream: MediaStream | null = null

  private recorder: MediaRecorder | null = null

  private timer: ReturnType<typeof setTimeout> | null = null

  private endpoint: string

  private apiKey?: string

  private language: string

  private onTranscriptCallback:
    ((text: string) => void) | null = null

  private onStatusCallback:
    ((status: ASRStatus) => void) | null = null


  constructor(options: ExternalASRProviderOptions) {

    this.endpoint = options.endpoint

    this.apiKey = options.apiKey

    this.language = options.language || 'en-US'

  }


  onTranscript(
    callback: (text: string) => void
  ) {

    this.onTranscriptCallback = callback

  }


  onStatus(
    callback: (status: ASRStatus) => void
  ) {

    this.onStatusCallback = callback

  }


  private setStatus(status: ASRStatus) {

    this.status = status

    console.log(
      '[External ASR] Status:',
      status
    )

    this.onStatusCallback?.(status)

  }


  async start() {

    try {

      console.log(
        '[External ASR] Starting'
      )

      console.log(
        '[External ASR] Endpoint:',
        this.endpoint
      )

      console.log(
        '[External ASR] Language:',
        this.language
      )

      this.stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        })

      console.log(
        '[External ASR] Microphone ready'
      )

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus'
      ]

      let selectedMimeType = ''

      for (const type of mimeTypes) {

        if (
          MediaRecorder.isTypeSupported(type)
        ) {

          selectedMimeType = type

          break

        }

      }

      console.log(
        '[External ASR] MIME type:',
        selectedMimeType || 'browser default'
      )

      this.recorder =
        selectedMimeType
          ? new MediaRecorder(
              this.stream,
              {
                mimeType: selectedMimeType
              }
            )
          : new MediaRecorder(
              this.stream
            )

      this.setStatus('listening')

      this.recordChunk()

    } catch (error) {

      console.error(
        '[External ASR] Start error:',
        error
      )

      this.setStatus('error')

      throw error

    }

  }


  private recordChunk() {

    if (
      !this.recorder ||
      this.status !== 'listening'
    ) {

      return

    }

    const recorder = this.recorder

    const parts: Blob[] = []

    recorder.ondataavailable = (
      event: BlobEvent
    ) => {

      if (event.data.size > 0) {

        parts.push(event.data)

      }

    }


    recorder.onstop = async () => {

      const mimeType =
        recorder.mimeType ||
        'audio/webm'

      const blob =
        new Blob(
          parts,
          {
            type: mimeType
          }
        )

      console.log(
        '[External ASR] Chunk ready:',
        blob.size,
        blob.type
      )


      if (blob.size > 0) {

        try {

          await this.send(blob)

        } catch (error) {

          console.error(
            '[External ASR] Send error:',
            error
          )

        }

      }


      if (
        this.status === 'listening'
      ) {

        this.recordChunk()

      }

    }


    console.log(
      '[External ASR] Recording chunk'
    )

    recorder.start()


    this.timer =
      setTimeout(
        () => {

          if (
            recorder.state === 'recording'
          ) {

            console.log(
              '[External ASR] Stopping chunk'
            )

            recorder.stop()

          }

        },
        4000
      )

  }


  private async send(
    blob: Blob
  ) {

    console.log(
      '[External ASR] Sending audio'
    )

    console.log(
      '[External ASR] Audio size:',
      blob.size
    )

    console.log(
      '[External ASR] Audio type:',
      blob.type
    )


    const headers: HeadersInit = {

      'Content-Type':
        blob.type ||
        'audio/webm',

      'Accept':
        'application/json'

    }


    if (this.apiKey) {

      headers[
        'Authorization'
      ] =
        `Bearer ${this.apiKey}`

    }


    console.log(
      '[External ASR] >>> POST',
      this.endpoint
    )


    const response =
      await fetch(
        `${this.endpoint}?language=${encodeURIComponent(
          this.language
        )}`,
        {
          method: 'POST',

          headers,

          body: blob,

          cache: 'no-store'
        }
      )


    console.log(
      '[External ASR] <<< HTTP',
      response.status
    )


    const responseText =
      await response.text()


    console.log(
      '[External ASR] Response:',
      responseText
    )


    if (!response.ok) {

      throw new Error(
        `ASR server returned ${response.status}: ${responseText}`
      )

    }


    let data: {
      text?: string
      language?: string
    }


    try {

      data =
        JSON.parse(responseText)

    } catch {

      throw new Error(
        'ASR server returned invalid JSON'
      )

    }


    const text =
      (data.text || '').trim()


    console.log(
      '[External ASR] Final transcript:',
      text
    )


    if (text) {

      console.log(
        '[External ASR] Delivering transcript'
      )

      this.onTranscriptCallback?.(text)

    } else {

      console.log(
        '[External ASR] Empty transcript'
      )

    }

  }


  async stop() {

    console.log(
      '[External ASR] Stopping'
    )

    this.setStatus('idle')


    if (this.timer) {

      clearTimeout(this.timer)

      this.timer = null

    }


    if (
      this.recorder &&
      this.recorder.state === 'recording'
    ) {

      this.recorder.stop()

    }


    this.recorder = null


    if (this.stream) {

      this.stream
        .getTracks()
        .forEach(
          track => track.stop()
        )

      this.stream = null

    }

  }


  getStatus(): ASRStatus {

    return this.status

  }

}
