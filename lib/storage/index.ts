import type { Experiment, Session, Settings } from '@/types'

const KEYS = {
  sessions: 'livecaption:sessions:v1',
  experiments: 'livecaption:experiments:v1',
  settings: 'livecaption:settings:v1',
} as const

export const DEFAULT_SETTINGS: Settings = {
  provider: 'demo',
  language: 'en-US',
  captionSize: 32,
  captionTheme: 'classic',
  backgroundOpacity: 0.85,
  autoScroll: true,
  highContrast: false,
  reducedMotion: false,
  speakerLabels: true,
  demoMode: false,
}

export const EMPTY_SESSIONS: Session[] = []
export const EMPTY_EXPERIMENTS: Experiment[] = []

export class StorageError extends Error {}

const cache = new Map<string, unknown>()
const listeners = new Set<() => void>()

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

function emit() {
  for (const l of listeners) l()
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key && (Object.values(KEYS) as string[]).includes(e.key)) {
      cache.delete(e.key)
      listener()
    }
  }
  if (isBrowser()) window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    if (isBrowser()) window.removeEventListener('storage', onStorage)
  }
}

function read<T>(key: string, fallback: T, transform?: (v: T) => T): T {
  if (!isBrowser()) return fallback
  if (cache.has(key)) return cache.get(key) as T
  let value = fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw) value = JSON.parse(raw) as T
  } catch {
    value = fallback
  }
  if (transform) value = transform(value)
  cache.set(key, value)
  return value
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    throw new StorageError(
      err instanceof DOMException && err.name === 'QuotaExceededError'
        ? 'Browser storage is full. Delete old sessions and try again.'
        : 'Could not write to browser storage.',
    )
  }
  cache.set(key, value)
  emit()
}

// Sessions
export const getSessions = (): Session[] =>
  read<Session[]>(KEYS.sessions, EMPTY_SESSIONS, (v) => (Array.isArray(v) ? v : EMPTY_SESSIONS))

export const getSession = (id: string) => getSessions().find((s) => s.id === id) ?? null

export function saveSession(session: Session) {
  const others = getSessions().filter((s) => s.id !== session.id)
  write(KEYS.sessions, [session, ...others])
}

export function renameSession(id: string, name: string) {
  write(
    KEYS.sessions,
    getSessions().map((s) => (s.id === id ? { ...s, name } : s)),
  )
}

export function deleteSession(id: string) {
  write(
    KEYS.sessions,
    getSessions().filter((s) => s.id !== id),
  )
}

// Experiments
export const getExperiments = (): Experiment[] =>
  read<Experiment[]>(KEYS.experiments, EMPTY_EXPERIMENTS, (v) => (Array.isArray(v) ? v : EMPTY_EXPERIMENTS))

export function nextExperimentCode(): string {
  const max = getExperiments().reduce((m, e) => {
    const n = Number.parseInt(e.code.replace(/\D/g, ''), 10)
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `EXP-${String(max + 1).padStart(3, '0')}`
}

export function saveExperiment(exp: Experiment) {
  const list = getExperiments()
  const exists = list.some((e) => e.id === exp.id)
  write(KEYS.experiments, exists ? list.map((e) => (e.id === exp.id ? exp : e)) : [...list, exp])
}

export function deleteExperiment(id: string) {
  write(
    KEYS.experiments,
    getExperiments().filter((e) => e.id !== id),
  )
}

// Settings
export const getSettings = (): Settings =>
  read<Settings>(KEYS.settings, DEFAULT_SETTINGS, (v) => ({ ...DEFAULT_SETTINGS, ...(v ?? {}) }))

export function saveSettings(patch: Partial<Settings>) {
  write(KEYS.settings, { ...getSettings(), ...patch })
}

export function resetSettings() {
  write(KEYS.settings, DEFAULT_SETTINGS)
}

export function clearAllData() {
  if (!isBrowser()) return
  for (const k of Object.values(KEYS)) {
    window.localStorage.removeItem(k)
    cache.delete(k)
  }
  emit()
}

export function storageUsageBytes(): number | null {
  if (!isBrowser()) return null
  let total = 0
  for (const k of Object.values(KEYS)) total += (window.localStorage.getItem(k)?.length ?? 0) * 2
  return total
}
