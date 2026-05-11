'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getIdToken } from './auth'

const WS_ENDPOINT = 'wss://d5vfjgraah.execute-api.us-east-1.amazonaws.com/prod'

export interface DuelPlayer {
  userId: string
  nickname: string
  tier: string
  score: number
  isMe?: boolean
}

export interface DuelQuestion {
  question: string
  options: string[]
}

export interface DuelSnapshot {
  duelId: string
  status: 'playing' | 'finished' | 'abandoned'
  currentQ: number
  questions: number
  question: DuelQuestion
  players: DuelPlayer[]
  questionTimeMs: number
}

export type DuelMessage =
  | { type: 'queued' }
  | { type: 'matched'; duel: DuelSnapshot }
  | { type: 'nextQuestion'; duelId: string; questionIdx: number; question: DuelQuestion; scores: { userId: string; score: number }[] }
  | { type: 'answerSubmitted'; duelId: string; questionIdx: number; byUserId: string; correct: boolean; scores: { userId: string; score: number }[] }
  | { type: 'duelEnded'; duelId: string; reason: 'win' | 'loss' | 'draw' | 'opponent_abandoned' | 'abandon'; winnerId: string | null; xpAwarded: number; finalScores: { userId: string; score: number; nickname?: string }[] }
  | { type: 'error'; code: string }

export type ConnectionState = 'disconnected' | 'connecting' | 'open' | 'closed'

interface UseDuelOpts {
  onMessage?: (msg: DuelMessage) => void
}

export function useDuelSocket(opts: UseDuelOpts = {}) {
  const [state, setState] = useState<ConnectionState>('disconnected')
  const [lastError, setLastError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(opts.onMessage)
  onMessageRef.current = opts.onMessage

  const connect = useCallback(async () => {
    if (wsRef.current && (state === 'open' || state === 'connecting')) return
    setLastError(null)
    setState('connecting')
    const token = await getIdToken()
    if (!token) {
      setLastError('No estàs autenticat')
      setState('disconnected')
      return
    }
    const ws = new WebSocket(`${WS_ENDPOINT}?token=${encodeURIComponent(token)}`)
    wsRef.current = ws
    ws.onopen = () => setState('open')
    ws.onclose = () => { setState('closed'); wsRef.current = null }
    ws.onerror = () => { setLastError('Error de connexió'); }
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as DuelMessage
        onMessageRef.current?.(msg)
      } catch (err) { console.warn('bad ws msg', err) }
    }
  }, [state])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setState('disconnected')
  }, [])

  const send = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify(payload))
    return true
  }, [])

  useEffect(() => {
    return () => { wsRef.current?.close() }
  }, [])

  return { state, lastError, connect, disconnect, send }
}
