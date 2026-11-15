'use client'

import { useSyncExternalStore } from 'react'

// Hydration-safe readers for sessionStorage/localStorage and a 1-second clock (Cache Components forbids Date.now() during prerender).

const EVENT = 'kf-storage'

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

/** Timestamp stored in sessionStorage; 0 if missing, -1 before hydration. */
export function useSessionNumber(key: string) {
  return useSyncExternalStore(
    subscribe,
    () => Number(sessionStorage.getItem(key)) || 0,
    () => -1,
  )
}

export function setSessionNumber(key: string, value: number | null) {
  if (value === null) sessionStorage.removeItem(key)
  else sessionStorage.setItem(key, String(value))
  window.dispatchEvent(new Event(EVENT))
}

/** Same login flag the other admin pages use (localStorage 'admin'); null before hydration. */
export function useAdminFlag() {
  return useSyncExternalStore(
    subscribe,
    () => !!localStorage.getItem('admin'),
    () => null,
  )
}

let currentTime = 0
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function subscribeClock(callback: () => void) {
  listeners.add(callback)
  if (!timer) {
    const tick = () => {
      currentTime = Date.now()
      listeners.forEach((l) => l())
    }
    tick()
    timer = setInterval(tick, 1000)
  }
  return () => {
    listeners.delete(callback)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

/** Current time, updated every second; 0 until mounted. */
export function useNow() {
  return useSyncExternalStore(subscribeClock, () => currentTime, () => 0)
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
