'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type MicState = 'inactive' | 'requesting' | 'active' | 'denied' | 'unavailable'

const VOICE_THRESHOLD = 0.04

export interface AudioAnalyserApi {
  micState: MicState
  level: number
  voiceActive: boolean
  silenceMs: number
  analyserRef: React.RefObject<AnalyserNode | null>
  startMic: () => Promise<boolean>
  stopMic: () => void
}

/** Local-only microphone analysis via the Web Audio API. Audio never leaves the device. */
export function useAudioAnalyser(): AudioAnalyserApi {
  const [micState, setMicState] = useState<MicState>('inactive')
  const [level, setLevel] = useState(0)
  const [silenceMs, setSilenceMs] = useState(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastVoiceRef = useRef(0)

  const stopMic = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
    analyserRef.current = null
    setLevel(0)
    setSilenceMs(0)
    setMicState((s) => (s === 'denied' || s === 'unavailable' ? s : 'inactive'))
  }, [])

  const startMic = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      setMicState('unavailable')
      return false
    }
    if (streamRef.current) return true
    setMicState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.6
      source.connect(analyser)
      streamRef.current = stream
      ctxRef.current = ctx
      analyserRef.current = analyser
      lastVoiceRef.current = performance.now()
      const buf = new Float32Array(analyser.fftSize)
      intervalRef.current = setInterval(() => {
        analyser.getFloatTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
        const rms = Math.sqrt(sum / buf.length)
        const now = performance.now()
        if (rms > VOICE_THRESHOLD) lastVoiceRef.current = now
        setLevel(Math.min(1, rms * 4))
        setSilenceMs(now - lastVoiceRef.current)
      }, 120)
      setMicState('active')
      return true
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
      setMicState(denied ? 'denied' : 'unavailable')
      return false
    }
  }, [])

  useEffect(() => stopMic, [stopMic])

  return {
    micState,
    level,
    voiceActive: micState === 'active' && level > VOICE_THRESHOLD * 4,
    silenceMs,
    analyserRef,
    startMic,
    stopMic,
  }
}
