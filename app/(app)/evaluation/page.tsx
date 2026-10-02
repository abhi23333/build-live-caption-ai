import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageHeader } from '@/components/metric'
import { EvaluationWorkbench } from '@/components/evaluation/evaluation-workbench'

export const metadata: Metadata = { title: 'Evaluation' }

export default function EvaluationPage() {
  return (
    <>
      <PageHeader
        eyebrow="Evaluation"
        title="Word & character error rate"
        description="Compare an ASR prediction against a reference transcript using Levenshtein alignment. Every number on this page is computed from your input."
      />
      <Suspense>
        <EvaluationWorkbench />
      </Suspense>
    </>
  )
}
