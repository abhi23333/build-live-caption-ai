import { cn } from '@/lib/utils'
import type { MetricSource } from '@/types'

const SOURCE_STYLE: Record<MetricSource, string> = {
  MEASURED: 'border-caption/40 bg-caption/10 text-caption',
  SIMULATED: 'border-chart-2/40 bg-chart-2/10 text-chart-2',
  IMPORTED: 'border-foreground/30 bg-foreground/5 text-foreground/80',
  NOT_MEASURED: 'border-border bg-transparent text-muted-foreground',
}

const SOURCE_LABEL: Record<MetricSource, string> = {
  MEASURED: 'Measured',
  SIMULATED: 'Simulated',
  IMPORTED: 'Imported',
  NOT_MEASURED: 'Not measured',
}

export function SourceBadge({ source, className }: { source: MetricSource; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
        SOURCE_STYLE[source],
        className,
      )}
    >
      <span className="sr-only">Metric source: </span>
      {SOURCE_LABEL[source]}
    </span>
  )
}

interface MetricStatProps {
  label: string
  value: string | null
  source: MetricSource
  detail?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function MetricStat({ label, value, source, detail, className, size = 'md' }: MetricStatProps) {
  const effective: MetricSource = value === null ? 'NOT_MEASURED' : source
  return (
    <div className={cn('flex flex-col gap-2 rounded-xl border bg-card/60 p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <SourceBadge source={effective} />
      </div>
      <span
        className={cn(
          'font-mono tabular-nums tracking-tight',
          value === null && 'text-muted-foreground',
          size === 'sm' && 'text-lg',
          size === 'md' && 'text-2xl',
          size === 'lg' && 'text-4xl',
        )}
      >
        {value ?? 'Not measured'}
      </span>
      {detail ? <div className="text-xs leading-relaxed text-muted-foreground">{detail}</div> : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="font-medium">{title}</p>
      {description ? <p className="max-w-md text-sm text-pretty text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        {eyebrow ? (
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-caption">{eyebrow}</span>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">{title}</h1>
        {description ? <p className="max-w-2xl text-pretty text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-4 rounded-2xl border bg-card/40 p-5', className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {title ? <h2 className="font-semibold tracking-tight">{title}</h2> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-lg border border-input bg-input/30 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 [&>option]:bg-popover',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
