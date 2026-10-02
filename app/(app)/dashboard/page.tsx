import type { Metadata } from 'next'
import { PageHeader } from '@/components/metric'
import { DashboardView } from '@/components/dashboard/dashboard-view'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Totals and trends computed from sessions and experiments stored in this browser."
      />
      <DashboardView />
    </>
  )
}
