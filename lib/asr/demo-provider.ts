import type { ASRStatus } from '@/types'
import { MODEL_INFO } from './registry'
import { ASRError, type ASRProvider, type ProviderEvents, type StartOptions } from './types'

export const DEMO_SCRIPT: { speaker: string; text: string }[] = [
  { speaker: 'Speaker 1', text: 'Good morning everyone.' },
  { speaker: 'Speaker 1', text: 'Today we are going to explore the fundamentals of machine learning.' },
  {
    speaker: 'Speaker 1',
    text: 'A machine learning model learns patterns from data instead of following hand written rules.',
  },
  { speaker: 'Speaker 1', text: 'Let us start with a simple question. What is a neural network?' },
  {
    speaker: 'Speaker 1',
    text: 'A neural network is a stack of layers, and each layer transforms its input into a slightly more useful representation.',
  },
  { speaker: 'Speaker 2', text: 'Professor, how does the network know which representation is useful?' },
  {
    speaker: 'Speaker 1',
    text: 'Great question. We define a loss function that measures how wrong the predictions are.',
  },
  {
    speaker: 'Speaker 1',
    text: 'Then gradient descent nudges every weight in the direction that reduces that loss.',
  },
  {
    speaker: 'Speaker 1',
    text: 'Speech recognition works the same way. The model maps audio features to the most likely sequence of words.',
  },
  {
    speaker: 'Speaker 1',
    text: 'We evaluate it using word error rate, which counts substitutions, deletions and insertions.',
  },
  { speaker: 'Speaker 2', text: 'So a lower word error rate means better captions?' },
  {
    speaker: 'Speaker 1',
    text: 'Exactly. And for live captioning, latency matters just as much as accuracy.',
  },
  { speaker: 'Speaker 1', text: 'That is all for today. Thank you for listening.' },
]

/** Deterministic pseudo-random sequence so simulated values are reproducible. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WORD_INTERVAL_MS = 240
const SEGMENT_GAP_MS = 650

export class DemoASRProvider implements ASRProvider {
  readonly id = 'demo' as const
  private status: ASRStatus = 'idle'
  private timer: ReturnType<typeof setTimeout> | null = null
  private segIndex = 0
  private wordIndex = 0
  private rand = mulberry32(42)

  constructor(private events: ProviderEvents) {}

  private setStatus(s: ASRStatus) {
    this.status = s
    this.events.onStatus(s)
  }

  async start({ language }: StartOptions) {
    if (MODEL_INFO.demo.languages[language] !== 'Supported') {
      throw new ASRError(
        'language-not-supported',
        'Demo ASR only contains an English transcript. Switch the language to English.',
      )
    }
    this.segIndex = 0
    this.wordIndex = 0
    this.rand = mulberry32(42)
    this.setStatus('listening')
    this.schedule(400)
  }

  private schedule(delay: number) {
    this.clear()
    this.timer = setTimeout(() => this.tick(), delay)
  }

  private clear() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private tick() {
    if (this.status !== 'listening') return
    const seg = DEMO_SCRIPT[this.segIndex]
    if (!seg) {
      this.setStatus('stopped')
      this.events.onEnd()
      return
    }
    const words = seg.text.split(' ')
    this.wordIndex++
    if (this.wordIndex < words.length) {
      this.events.onInterim(words.slice(0, this.wordIndex).join(' '))
      this.schedule(WORD_INTERVAL_MS + this.rand() * 90)
      return
    }
    const audioMs = words.length * WORD_INTERVAL_MS
    const latencyMs = 180 + this.rand() * 260
    this.events.onFinal({
      text: seg.text,
      speaker: seg.speaker,
      confidence: 0.84 + this.rand() * 0.14,
      latencyMs,
      rtf: (latencyMs * 0.6) / audioMs,
      source: 'SIMULATED',
    })
    this.segIndex++
    this.wordIndex = 0
    this.schedule(SEGMENT_GAP_MS)
  }

  stop() {
    this.clear()
    this.setStatus('stopped')
  }

  pause() {
    if (this.status !== 'listening') return
    this.clear()
    this.setStatus('paused')
  }

  resume() {
    if (this.status !== 'paused') return
    this.setStatus('listening')
    this.schedule(200)
  }

  getStatus() {
    return this.status
  }

  getModelInfo() {
    return MODEL_INFO.demo
  }
}
