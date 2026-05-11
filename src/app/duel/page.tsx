'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sword, X, Trophy, Heart } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useDuelSocket, type DuelSnapshot, type DuelMessage } from '@/lib/duels'
import { Mascot } from '@/components/ui/Mascot'
import { Button } from '@/components/ui/Button'
import { TierBadge } from '@/components/ui/TierBadge'
import { HeaderStats } from '@/components/ui/HeaderStats'
import { fireConfetti } from '@/components/ui/Confetti'
import { DuelTutorial } from '@/components/duel/DuelTutorial'
import { playCorrect, playWrong } from '@/lib/sounds'
import { cn } from '@/lib/utils'

type Mode =
  | { kind: 'idle' }
  | { kind: 'queued'; startedAt: number }
  | { kind: 'countdown'; duel: DuelSnapshot; secs: number }
  | { kind: 'playing'; duel: DuelSnapshot; questionStartedAt: number; submitted: boolean; lastAnswerCorrect?: boolean }
  | { kind: 'ended'; reason: 'win' | 'loss' | 'draw' | 'opponent_abandoned' | 'abandon'; xpAwarded: number; finalScores: { userId: string; score: number; nickname?: string }[]; winnerId: string | null }

export default function DuelPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mode, setMode] = useState<Mode>({ kind: 'idle' })

  useEffect(() => {
    if (!loading && !user) router.replace('/signin')
  }, [loading, user, router])

  const onMessage = useCallback((msg: DuelMessage) => {
    if (msg.type === 'queued') {
      setMode({ kind: 'queued', startedAt: Date.now() })
    } else if (msg.type === 'matched') {
      setMode({ kind: 'countdown', duel: msg.duel, secs: 3 })
    } else if (msg.type === 'nextQuestion') {
      setMode((prev) => {
        if (prev.kind !== 'playing') return prev
        return {
          kind: 'playing',
          duel: { ...prev.duel, currentQ: msg.questionIdx, question: msg.question, players: prev.duel.players.map((p) => ({ ...p, score: msg.scores.find((s) => s.userId === p.userId)?.score ?? p.score })) },
          questionStartedAt: Date.now(),
          submitted: false,
        }
      })
    } else if (msg.type === 'answerSubmitted') {
      const isMe = user?.sub === msg.byUserId
      if (isMe) { msg.correct ? playCorrect() : playWrong() }
      setMode((prev) => {
        if (prev.kind !== 'playing') return prev
        return {
          ...prev,
          submitted: isMe ? true : prev.submitted,
          lastAnswerCorrect: isMe ? msg.correct : prev.lastAnswerCorrect,
          duel: { ...prev.duel, players: prev.duel.players.map((p) => ({ ...p, score: msg.scores.find((s) => s.userId === p.userId)?.score ?? p.score })) },
        }
      })
    } else if (msg.type === 'duelEnded') {
      setMode({ kind: 'ended', reason: msg.reason, xpAwarded: msg.xpAwarded, finalScores: msg.finalScores, winnerId: msg.winnerId })
      if (msg.reason === 'win' || msg.reason === 'opponent_abandoned') {
        setTimeout(() => fireConfetti({ x: 0.5, y: 0.3 }), 200)
      }
    } else if (msg.type === 'error') {
      console.warn('duel error', msg.code)
    }
  }, [user?.sub])

  const { state, lastError, connect, disconnect, send } = useDuelSocket({ onMessage })

  // Countdown handler — transition to playing after 3 seconds
  useEffect(() => {
    if (mode.kind !== 'countdown') return
    if (mode.secs <= 0) {
      setMode({ kind: 'playing', duel: mode.duel, questionStartedAt: Date.now(), submitted: false })
      return
    }
    const t = setTimeout(() => setMode((m) => m.kind === 'countdown' ? { ...m, secs: m.secs - 1 } : m), 1000)
    return () => clearTimeout(t)
  }, [mode])

  // Auto-connect on mount
  useEffect(() => {
    if (user && state === 'disconnected') connect()
    return () => { /* cleanup handled by hook */ }
  }, [user, state, connect])

  const startMatchmaking = () => {
    if (state !== 'open') return
    send({ action: 'joinQueue' })
  }

  const cancelQueue = () => {
    send({ action: 'leaveQueue' })
    setMode({ kind: 'idle' })
  }

  const wantBot = () => {
    send({ action: 'wantBot' })
  }

  const submitAnswer = (idx: number) => {
    if (mode.kind !== 'playing' || mode.submitted) return
    send({ action: 'submitAnswer', questionIdx: mode.duel.currentQ, answer: idx })
  }

  const leaveDuel = () => {
    if (!confirm('Estàs segur que vols abandonar? El rival guanyarà.')) return
    send({ action: 'leaveDuel' })
  }

  if (loading || !user) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 md:px-8 py-8 md:py-12">
      <DuelTutorial />
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Mascot expression={mode.kind === 'playing' ? 'cheering' : 'happy'} size="md" />
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-1">PvP en directe</p>
            <h1 className="text-3xl md:text-4xl leading-tight">Duel</h1>
          </div>
        </div>
        <HeaderStats showShop={false} />
      </header>

      {state === 'connecting' && (
        <div className="bg-blue-soft border-2 border-blue/40 rounded-2xl p-4 mb-4 inline-flex items-center gap-2">
          <Loader2 size={18} className="animate-spin text-blue-dark" />
          <span className="text-sm font-extrabold text-blue-dark">Connectant…</span>
        </div>
      )}
      {lastError && (
        <div className="bg-red-soft border-2 border-red/40 rounded-2xl p-4 mb-4 text-sm font-extrabold text-red-dark">
          {lastError}
        </div>
      )}

      {mode.kind === 'idle' && <IdleView onStart={startMatchmaking} disabled={state !== 'open'} />}
      {mode.kind === 'queued' && <QueuedView onCancel={cancelQueue} onWantBot={wantBot} startedAt={mode.startedAt} />}
      {mode.kind === 'countdown' && <CountdownView duel={mode.duel} secs={mode.secs} />}
      {mode.kind === 'playing' && (
        <PlayingView
          duel={mode.duel}
          submitted={mode.submitted}
          lastCorrect={mode.lastAnswerCorrect}
          onAnswer={submitAnswer}
          onLeave={leaveDuel}
        />
      )}
      {mode.kind === 'ended' && (
        <EndedView
          reason={mode.reason}
          xpAwarded={mode.xpAwarded}
          finalScores={mode.finalScores}
          winnerId={mode.winnerId}
          onPlayAgain={() => { setMode({ kind: 'idle' }); }}
          onExit={() => { disconnect(); router.replace('/') }}
        />
      )}
    </div>
  )
}

function IdleView({ onStart, disabled }: { onStart: () => void; disabled: boolean }) {
  return (
    <div className="bg-paper border-2 border-line border-b-[6px] rounded-2xl p-6 md:p-8 text-center">
      <Mascot expression="cheering" size="lg" className="mx-auto mb-4" />
      <h2 className="text-2xl md:text-3xl mb-2">Llest per a un duel?</h2>
      <p className="text-base text-ink-soft font-semibold mb-6 max-w-[40ch] mx-auto">
        7 preguntes contra un rival real. Guanya el qui més encerti.
      </p>
      <div className="flex justify-center gap-6 mb-6 text-sm font-bold text-ink-soft">
        <span className="inline-flex items-center gap-1"><Trophy size={16} className="text-orange-dark fill-current" /> Guanyador +50 XP</span>
        <span className="inline-flex items-center gap-1"><Heart size={16} className="text-red fill-current" /> Perdedor +15 XP</span>
      </div>
      <Button variant="primary" size="lg" onClick={onStart} disabled={disabled} leading={<Sword size={20} strokeWidth={3} />}>
        Buscar rival
      </Button>
    </div>
  )
}

function QueuedView({ onCancel, onWantBot, startedAt }: { onCancel: () => void; onWantBot: () => void; startedAt: number }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500)
    return () => clearInterval(id)
  }, [startedAt])
  const showBotOption = elapsed >= 30
  return (
    <div className="bg-blue-soft border-2 border-blue/40 border-b-[6px] rounded-2xl p-6 md:p-8 text-center">
      <div className="animate-float mb-4 flex justify-center"><Mascot expression="thinking" size="lg" /></div>
      <h2 className="text-2xl mb-2 text-blue-dark">Buscant rival…</h2>
      <p className="text-base text-blue-dark/80 font-semibold mb-2">
        {showBotOption ? 'Ningú a la cua ara. Vols jugar contra un bot?' : 'Pot trigar uns segons.'}
      </p>
      <p className="text-sm font-bold text-blue-dark/80 tabular-nums mb-6">{elapsed}s</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {showBotOption && (
          <Button variant="primary" size="md" onClick={onWantBot} leading={<Sword size={16} strokeWidth={3} />}>
            Jugar contra bot
          </Button>
        )}
        <Button variant="secondary" size="md" onClick={onCancel} leading={<X size={16} strokeWidth={3} />}>
          Cancel·lar
        </Button>
      </div>
    </div>
  )
}

function CountdownView({ duel, secs }: { duel: DuelSnapshot; secs: number }) {
  const me = duel.players.find((p) => p.isMe)
  const op = duel.players.find((p) => !p.isMe)
  return (
    <div className="bg-paper border-2 border-line border-b-[6px] rounded-2xl p-6 md:p-8 text-center">
      <div className="grid grid-cols-3 items-center gap-4 mb-6">
        <PlayerCard player={me} side="left" />
        <p className="text-3xl md:text-5xl font-black text-orange-dark">VS</p>
        <PlayerCard player={op} side="right" />
      </div>
      <p className="text-base font-bold text-ink-muted mb-2 uppercase tracking-widest">
        {secs > 0 ? 'Comencem en' : 'Som-hi!'}
      </p>
      <p className="text-7xl font-black text-primary-dark tabular-nums animate-bounce-in" key={secs}>
        {secs > 0 ? secs : '🥊'}
      </p>
    </div>
  )
}

function PlayerCard({ player, side }: { player: DuelPlayer | undefined; side: 'left' | 'right' }) {
  if (!player) return <div />
  return (
    <div className={`flex flex-col items-center gap-2 ${side === 'left' ? '' : ''}`}>
      <div className="w-16 h-16 rounded-full bg-primary border-b-[4px] border-primary-dark flex items-center justify-center text-white text-xl font-black">
        {player.nickname.slice(0, 2).toUpperCase()}
      </div>
      <p className="text-sm font-extrabold text-ink truncate max-w-[12ch]">{player.nickname}</p>
      <TierBadge tier={player.tier as 'bronze'} size="sm" />
    </div>
  )
}

type DuelPlayer = DuelSnapshot['players'][number]

function PlayingView({
  duel, submitted, lastCorrect, onAnswer, onLeave,
}: {
  duel: DuelSnapshot
  submitted: boolean
  lastCorrect: boolean | undefined
  onAnswer: (idx: number) => void
  onLeave: () => void
}) {
  const me = duel.players.find((p) => p.isMe)
  const op = duel.players.find((p) => !p.isMe)
  const total = duel.questions
  const idx = duel.currentQ

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-paper border-2 border-line border-b-[4px] rounded-2xl p-3">
        <div className="text-right">
          <p className="text-sm font-extrabold text-primary-dark truncate">{me?.nickname}</p>
          <p className="text-2xl font-black text-primary-dark tabular-nums">{me?.score ?? 0}</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-orange text-white border-b-[3px] border-orange-dark text-xs font-extrabold">
          {idx + 1}/{total}
        </div>
        <div className="text-left">
          <p className="text-sm font-extrabold text-blue-dark truncate">{op?.nickname}</p>
          <p className="text-2xl font-black text-blue-dark tabular-nums">{op?.score ?? 0}</p>
        </div>
      </div>

      {/* Question */}
      <section className="bg-paper border-2 border-line border-b-[6px] rounded-2xl p-5 md:p-6">
        <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">Pregunta {idx + 1}</p>
        <h2 className="text-xl md:text-2xl mb-5">{duel.question.question}</h2>
        <div className="space-y-2.5">
          {duel.question.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onAnswer(i)}
              disabled={submitted}
              className={cn(
                'w-full text-left rounded-xl px-4 py-3 text-base font-extrabold border-2 border-b-[4px] transition-all',
                submitted
                  ? 'bg-paper-3 border-line text-ink-muted cursor-not-allowed'
                  : 'bg-paper border-line-strong text-ink hover:bg-primary-soft active:translate-y-0.5 active:border-b-2',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        {submitted && (
          <p className={cn(
            'text-sm font-extrabold mt-4 px-3 py-2 rounded-xl border-2',
            lastCorrect
              ? 'bg-primary-soft border-primary/40 text-primary-dark'
              : 'bg-red-soft border-red/40 text-red-dark',
          )}>
            {lastCorrect ? '✓ Esperant el rival…' : '✗ Resposta incorrecta. Esperant rival…'}
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={onLeave}
        className="block mx-auto text-sm font-bold text-ink-muted underline hover:text-red-dark"
      >
        Abandonar
      </button>
    </div>
  )
}

function EndedView({
  reason, xpAwarded, finalScores, winnerId, onPlayAgain, onExit,
}: {
  reason: 'win' | 'loss' | 'draw' | 'opponent_abandoned' | 'abandon'
  xpAwarded: number
  finalScores: { userId: string; score: number; nickname?: string }[]
  winnerId: string | null
  onPlayAgain: () => void
  onExit: () => void
}) {
  const { user } = useAuth()
  const isWin = reason === 'win' || reason === 'opponent_abandoned'
  const isDraw = reason === 'draw'
  const me = finalScores.find((s) => s.userId === user?.sub)
  const op = finalScores.find((s) => s.userId !== user?.sub)

  return (
    <div className={`rounded-2xl border-2 border-b-[6px] p-6 md:p-8 text-center animate-bounce-in ${
      isWin ? 'bg-primary-soft border-primary/40'
      : isDraw ? 'bg-gold-soft border-gold/40'
      : 'bg-red-soft border-red/40'
    }`}>
      <Mascot expression={isWin ? 'cheering' : isDraw ? 'thinking' : 'sad'} size="xl" className="mx-auto mb-3" />
      <h2 className={`text-3xl md:text-4xl mb-2 ${isWin ? 'text-primary-dark' : isDraw ? 'text-orange-dark' : 'text-red-dark'}`}>
        {reason === 'win' && 'Has guanyat!'}
        {reason === 'loss' && 'Has perdut'}
        {reason === 'draw' && 'Empat!'}
        {reason === 'opponent_abandoned' && 'Victòria per abandó!'}
        {reason === 'abandon' && 'Has abandonat'}
      </h2>
      <p className="text-base font-bold text-ink-soft mb-6">
        {me?.score ?? 0} vs {op?.score ?? 0}
      </p>

      <div className="inline-flex items-center gap-2 bg-white/70 border-2 border-current/30 rounded-2xl px-4 py-3 mb-6">
        <Trophy size={20} className="text-orange-dark fill-current" />
        <span className="text-base font-extrabold text-orange-dark">+{xpAwarded} XP</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="primary" size="lg" onClick={onPlayAgain}>Un altre duel!</Button>
        <Button variant="secondary" size="lg" onClick={onExit}>Tornar a l&apos;inici</Button>
      </div>
    </div>
  )
}
