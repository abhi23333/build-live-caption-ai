'use client'

import { useSyncExternalStore } from 'react'
import {
  DEFAULT_SETTINGS,
  EMPTY_EXPERIMENTS,
  EMPTY_SESSIONS,
  getExperiments,
  getSessions,
  getSettings,
  subscribe,
} from '@/lib/storage'

export function useSessions() {
  return useSyncExternalStore(subscribe, getSessions, () => EMPTY_SESSIONS)
}

export function useExperiments() {
  return useSyncExternalStore(subscribe, getExperiments, () => EMPTY_EXPERIMENTS)
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS)
}

const noopSubscribe = () => () => {}

/** True only after hydration on the client. */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}
