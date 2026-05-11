'use client'

import { getIdToken } from './auth'

const VAPID_PUBLIC = 'BN-yupAoLA2KWWuowLQ5b6aX6HXGXLC7A6wYpyfalC0MI6vO83OzUSFpEYgor3-b22nQIan-13tjhOWiIp267D8'
const API_BASE = 'https://s3tmqeheg8.execute-api.us-east-1.amazonaws.com'

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new ArrayBuffer(raw.length)
  const view = new Uint8Array(out)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return out
}

export type PushSupport = 'supported' | 'denied' | 'unsupported'

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  return 'supported'
}

export async function isSubscribed(): Promise<boolean> {
  try {
    if (pushSupport() !== 'supported') return false
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return false
    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch { return false }
}

export async function subscribe(): Promise<{ ok: boolean; reason?: string }> {
  if (pushSupport() === 'unsupported') return { ok: false, reason: 'unsupported' }
  if (pushSupport() === 'denied') return { ok: false, reason: 'denied' }
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return { ok: false, reason: 'no_sw' }

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') return { ok: false, reason: 'denied' }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(VAPID_PUBLIC),
  })

  const token = await getIdToken()
  if (!token) return { ok: false, reason: 'not_authenticated' }

  const r = await fetch(`${API_BASE}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  })
  if (!r.ok) {
    await sub.unsubscribe().catch(() => {})
    return { ok: false, reason: `server_${r.status}` }
  }
  return { ok: true }
}

export async function unsubscribe(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    const token = await getIdToken()
    if (token) {
      await fetch(`${API_BASE}/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
    }
  } catch {}
}
