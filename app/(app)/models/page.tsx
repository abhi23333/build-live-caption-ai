import type { Metadata } from 'next'
import { PageHeader } from '@/components/metric'
import { ModelsView } from '@/components/models/models-view'

export const metadata: Metadata = { title: 'Models' }

export default function ModelsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Models"
        title="ASR providers"
        description="What each provider is, where audio is processed and which languages it handles. Details that are not published are marked Not provided."
      />
      <ModelsView />
    </>
  )
}
