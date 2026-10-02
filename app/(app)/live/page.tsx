import type { Metadata } from 'next'
import { PageHeader } from '@/components/metric'
import { CaptionConsole } from '@/components/captions/caption-console'

export const metadata: Metadata = { title: 'Live Captions' }

export default function LivePage() {
  return (
    <>
      <PageHeader
        eyebrow="Live"
        title="Live captioning"
        description="Choose a provider, pick a language and start. Sessions are saved to this browser when you stop."
      />
      <CaptionConsole />
    </>
  )
}
