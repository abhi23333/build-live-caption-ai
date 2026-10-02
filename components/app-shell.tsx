'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Accessibility,
  AudioLines,
  Boxes,
  FileText,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { useCaptionEngine } from '@/components/captions/caption-engine'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/live', label: 'Live Captions', icon: AudioLines },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transcripts', label: 'Transcripts', icon: FileText },
  { href: '/evaluation', label: 'Evaluation', icon: Gauge },
  { href: '/experiments', label: 'Experiments', icon: FlaskConical },
  { href: '/models', label: 'Models', icon: Boxes },
  { href: '/accessibility', label: 'Accessibility', icon: Accessibility },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { status } = useCaptionEngine()
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
                active && 'bg-sidebar-accent font-medium text-sidebar-foreground',
              )}
            >
              <Icon className={cn('size-4', active && 'text-caption')} aria-hidden />
              {label}
              {href === '/live' && status === 'listening' ? (
                <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase text-live">
                  <span className="pulse-dot size-1.5 rounded-full bg-live" aria-hidden />
                  Live
                </span>
              ) : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-caption focus:px-3 focus:py-2 focus:text-caption-foreground"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Logo className="px-2 pt-1" />
        <nav aria-label="Primary">
          <NavLinks />
        </nav>
        <p className="mt-auto px-2 text-[11px] leading-relaxed text-muted-foreground">
          Data is stored locally in this browser. Nothing is uploaded unless you configure an external ASR.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="flex size-9 items-center justify-center rounded-lg border"
          >
            {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </header>
        {open ? (
          <nav id="mobile-nav" aria-label="Primary" className="border-b bg-sidebar p-3 lg:hidden">
            <NavLinks onNavigate={() => setOpen(false)} />
          </nav>
        ) : null}
        <main id="main" className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
