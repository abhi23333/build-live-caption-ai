import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, AudioLines, Gauge, Languages, ShieldCheck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: AudioLines,
    title: 'Live captions',
    body: 'Stream speech to large, high-contrast captions with interim words, speaker labels and fullscreen projection.',
  },
  {
    icon: Gauge,
    title: 'Honest evaluation',
    body: 'Compute WER and CER with a full alignment diff. Every metric is labelled Measured, Simulated or Imported.',
  },
  {
    icon: Languages,
    title: 'Multilingual',
    body: 'English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi and Bengali — with per-provider support shown plainly.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    body: 'Sessions stay in your browser. External ASR keys stay on the server and never reach the client.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav aria-label="Primary" className="flex items-center gap-2">
          <Link href="/models" className={buttonVariants({ variant: 'ghost' })}>
            Models
          </Link>
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
            Open app
          </Link>
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div className="flex flex-col gap-6">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-caption">Real-time ASR for classrooms</span>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-balance md:text-6xl">
              Every word in the lecture, on screen as it&apos;s spoken.
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              LiveCaption AI turns live speech into accessible captions for deaf and hard-of-hearing students — and gives
              researchers the tools to measure how well each speech model really performs.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/live" className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-5 text-base')}>
                Start captioning
                <ArrowRight data-icon="inline-end" aria-hidden />
              </Link>
              <Link href="/evaluation" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'h-11 px-5 text-base')}>
                Evaluate a transcript
              </Link>
            </div>
          </div>

          <figure className="relative overflow-hidden rounded-2xl border">
            <Image
              src="/images/lecture-hall.jpg"
              alt="A lecture hall with a projected screen"
              width={1200}
              height={800}
              priority
              className="aspect-[4/3] w-full object-cover opacity-70"
            />
            <figcaption className="absolute inset-x-4 bottom-4 rounded-xl bg-black/85 px-5 py-4 backdrop-blur">
              <span className="block font-mono text-[10px] uppercase tracking-widest text-caption/70">Instructor</span>
              <span className="block text-xl font-medium leading-snug text-caption md:text-2xl">
                Today we look at how attention lets a model focus on the right words.
              </span>
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="features" className="border-t">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 id="features" className="sr-only">
              Features
            </h2>
            <ul className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex flex-col gap-3 bg-background p-6">
                  <Icon className="size-5 text-caption" aria-hidden />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground">
          <span>LiveCaption AI — accessible captioning research platform.</span>
          <Link href="/accessibility" className="hover:text-foreground">
            Accessibility statement
          </Link>
        </div>
      </footer>
    </div>
  )
}
