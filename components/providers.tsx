'use client'

import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { CaptionEngineProvider } from '@/components/captions/caption-engine'
import { useSettings } from '@/hooks/use-store'

function AccessibilityAttributes() {
  const { highContrast, reducedMotion } = useSettings()
  useEffect(() => {
    const el = document.documentElement
    el.dataset.highContrast = String(highContrast)
    el.dataset.reducedMotion = String(reducedMotion)
  }, [highContrast, reducedMotion])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CaptionEngineProvider>
      <AccessibilityAttributes />
      {children}
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </CaptionEngineProvider>
  )
}
