import type { Metadata } from 'next'
import { PageHeader } from '@/components/metric'
import { SettingsView } from '@/components/settings/settings-view'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Settings" title="Settings" description="Defaults, external ASR status and local data." />
      <SettingsView />
    </>
  )
}
