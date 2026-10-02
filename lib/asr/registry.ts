import type { LanguageCode, ModelInfo, SupportLevel } from '@/types'

export const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'en-US', label: 'English', native: 'English' },
  { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta-IN', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'bn-IN', label: 'Bengali', native: 'বাংলা' },
  { code: 'mr-IN', label: 'Marathi', native: 'मराठी' },
]

export const languageLabel = (code: string) => LANGUAGES.find((l) => l.code === code)?.label ?? code

function langs(en: SupportLevel, others: SupportLevel): Record<LanguageCode, SupportLevel> {
  return {
    'en-US': en,
    'hi-IN': others,
    'te-IN': others,
    'ta-IN': others,
    'kn-IN': others,
    'ml-IN': others,
    'bn-IN': others,
    'mr-IN': others,
  }
}

export const NOT_PROVIDED = 'Not provided'

export const MODEL_INFO: Record<'browser' | 'demo' | 'external' | 'whisper', ModelInfo> = {
  browser: {
    id: 'browser',
    name: 'Browser Speech Recognition',
    provider: 'Web Speech API (implemented by the browser vendor)',
    type: 'Streaming speech-to-text',
    architecture: NOT_PROVIDED,
    processingLocation: 'Browser-dependent. Chrome sends audio to a vendor speech service.',
    version: NOT_PROVIDED,
    languages: langs('Supported', 'Unknown'),
    notes:
      'Exposes interim/final results and an optional confidence score. Latency and RTF are not exposed by the API.',
  },
  demo: {
    id: 'demo',
    name: 'Demo ASR',
    provider: 'LiveCaption AI (local scripted playback)',
    type: 'Simulation — no neural model',
    architecture: 'Scripted transcript streamer',
    processingLocation: 'Local, in this browser tab',
    version: '1.0',
    languages: langs('Supported', 'Not Supported'),
    notes: 'Streams a predefined English lecture. Confidence, latency and RTF are SIMULATED.',
  },
  whisper: {
    id: 'whisper',
    name: 'Whisper',
    provider: 'OpenAI (open-source model weights)',
    type: 'Offline / chunked speech-to-text',
    architecture: 'Encoder–decoder Transformer',
    processingLocation: 'Self-hosted backend you connect via External ASR',
    version: NOT_PROVIDED,
    languages: langs('Supported', 'Supported'),
    notes:
      'Language list taken from the published multilingual model card. Not running in this app — connect it as an External ASR endpoint.',
  },
  external: {
    id: 'external',
    name: 'External ASR',
    provider: NOT_PROVIDED,
    type: 'Chunked HTTP speech-to-text',
    architecture: NOT_PROVIDED,
    processingLocation: 'Your configured ASR_ENDPOINT (proxied by /api/asr/transcribe)',
    version: NOT_PROVIDED,
    languages: langs('Unknown', 'Unknown'),
    notes: 'Configure ASR_PROVIDER, ASR_ENDPOINT and ASR_API_KEY on the server to enable.',
  },
}

export const PROVIDER_LABEL = {
  demo: 'Demo ASR',
  browser: 'Browser Speech',
  external: 'External ASR',
} as const
