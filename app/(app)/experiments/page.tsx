import type { Metadata } from 'next'
import { PageHeader } from '@/components/metric'
import { ExperimentsView } from '@/components/experiments/experiments-view'

export const metadata: Metadata = { title: 'Experiments' }

export default function ExperimentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Research"
        title="Experiment tracker"
        description="Compare ASR models across datasets, languages and hardware. No benchmark numbers are pre-filled — every row comes from you."
      />
      <ExperimentsView />
    </>
  )
}
