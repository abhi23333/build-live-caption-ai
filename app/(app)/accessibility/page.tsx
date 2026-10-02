import type { Metadata } from 'next'
import { PageHeader } from '@/components/metric'
import { AccessibilityView } from '@/components/accessibility/accessibility-view'

export const metadata: Metadata = { title: 'Accessibility' }

export default function AccessibilityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Accessibility"
        title="Make captions readable for everyone"
        description="Tune caption presentation for low vision, projector glare or distance viewing."
      />
      <AccessibilityView />
    </>
  )
}
