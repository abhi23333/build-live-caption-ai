import type { ProviderId } from '@/types'
import { BrowserSpeechProvider } from './browser-provider'
import { DemoASRProvider } from './demo-provider'
import { ExternalASRProvider } from './external-provider'
import type { ASRProvider, ProviderEvents } from './types'

export function createProvider(id: ProviderId, events: ProviderEvents): ASRProvider {
  switch (id) {
    case 'browser':
      return new BrowserSpeechProvider(events)
    case 'external':
      return new ExternalASRProvider(events)
    default:
      return new DemoASRProvider(events)
  }
}

export * from './types'
export { isBrowserSpeechSupported } from './browser-provider'
