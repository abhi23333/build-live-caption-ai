import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageHeader } from '@/components/metric'
import { TranscriptsView } from '@/components/transcripts/transcripts-view'

export const metadata: Metadata = { title: 'Transcripts' }

export default function TranscriptsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Archive"
        title="Transcripts"
        description="Review, search, rename and export saved captioning sessions."
      />
      <Suspense>
        <TranscriptsView />
      </Suspense>
    </>
  )
}
