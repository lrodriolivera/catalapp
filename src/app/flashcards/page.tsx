'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Volume2, CheckCircle2, ArrowLeft, Sparkles, Info } from 'lucide-react'
import { units, type VocabularyItem } from '@/data/units'
import {
  getCardStats,
  getDueCards,
  getNewCards,
  reviewCard,
} from '@/lib/spacedRepetition'
import { shuffle, speakCatalan, cn } from '@/lib/utils'
import { recordError } from '@/lib/errorLog'
import { loseHeart } from '@/lib/stats'
import { NoHeartsModal } from '@/components/ui/NoHeartsModal'
import { HeaderStats } from '@/components/ui/HeaderStats'
import BackLink from '@/components/exercises/ui/BackLink'
import ResultsScore from '@/components/exercises/ui/ResultsScore'
import { Mascot } from '@/components/ui/Mascot'

interface FlashcardData {
  wordId: string
  item: VocabularyItem
  category: string
  unitId: number
  unitTitle: string
}

type View = 'home' | 'session' | 'results'
type Quality = 0 | 1 | 2 | 3 | 4 | 5

function parseWordId(wordId: string): { unitId: number; catIdx: number; itemIdx: number } | null {
  const m = wordId.match(/^u(\d+)-(\d+)-(\d+)$/)
  if (!m) return null
  return { unitId: Number(m[1]), catIdx: Number(m[2]), itemIdx: Number(m[3]) }
}

function resolveCard(wordId: string): FlashcardData | null {
  const parsed = parseWordId(wordId)
  if (!parsed) return null
  const unit = units.find((u) => u.id === parsed.unitId)
  if (!unit) return null
  const categories = Object.keys(unit.vocabulary)
  const cat = categories[parsed.catIdx]
  if (!cat) return null
  const item = unit.vocabulary[cat]?.[parsed.itemIdx]
  if (!item) return null
  return { wordId, item, category: cat, unitId: unit.id, unitTitle: unit.subtitle }
}

export default function FlashcardsPage() {
  const [view, setView] = useState<View>('home')
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null)
  const [stats, setStats] = useState({ total: 0, mastered: 0, learning: 0, new: 0, dueToday: 0 })

  const [sessionCards, setSessionCards] = useState<FlashcardData[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [rated, setRated] = useState(false)
  const [sessionResults, setSessionResults] = useState<{ wordId: string; quality: Quality }[]>([])
  const [showNoHearts, setShowNoHearts] = useState(false)

  const refreshStats = useCallback(() => setStats(getCardStats()), [])

  useEffect(() => { refreshStats() }, [refreshStats])

  const startSession = useCallback(
    (onlyNew: boolean) => {
      const MAX_SESSION = 20
      let cardIds: string[] = []

      if (onlyNew) {
        const newIds = getNewCards(selectedUnit ?? undefined, MAX_SESSION)
        cardIds = shuffle(newIds)
      } else {
        const due = getDueCards()
        const dueIds = selectedUnit
          ? due.filter((c) => c.wordId.startsWith(`u${selectedUnit}-`)).map((c) => c.wordId)
          : due.map((c) => c.wordId)

        cardIds = shuffle(dueIds).slice(0, MAX_SESSION)

        if (cardIds.length < MAX_SESSION) {
          const newIds = getNewCards(selectedUnit ?? undefined, MAX_SESSION - cardIds.length)
          cardIds = [...cardIds, ...shuffle(newIds)]
        }
      }

      const resolved = cardIds.map(resolveCard).filter(Boolean) as FlashcardData[]
      if (resolved.length === 0) return

      setSessionCards(resolved)
      setCurrentIdx(0)
      setFlipped(false)
      setRated(false)
      setSessionResults([])
      setView('session')
    },
    [selectedUnit],
  )

  const rateCard = useCallback(
    (quality: Quality) => {
      const card = sessionCards[currentIdx]
      if (!card) return

      reviewCard(card.wordId, quality)
      setSessionResults((prev) => [...prev, { wordId: card.wordId, quality }])
      setRated(true)
      if (quality < 3) {
        recordError({
          context: card.item.spanish,
          userAnswer: '(no recordat)',
          correctAnswer: card.item.catalan,
          source: 'exercise',
          category: 'lexic',
          rule: `flashcard-u${card.unitId}`,
        })
        const s = loseHeart()
        if (s.hearts === 0) setShowNoHearts(true)
      }

      setTimeout(() => {
        if (currentIdx < sessionCards.length - 1) {
          setCurrentIdx((i) => i + 1)
          setFlipped(false)
          setRated(false)
        } else {
          refreshStats()
          setView('results')
        }
      }, 300)
    },
    [sessionCards, currentIdx, refreshStats],
  )

  const correctCount = useMemo(
    () => sessionResults.filter((r) => r.quality >= 3).length,
    [sessionResults],
  )

  const currentCard = sessionCards[currentIdx] ?? null

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 md:px-8 py-8 md:py-12">
      {view === 'home' && (
        <div>
          <header className="mb-8">
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
              Repàs espaiat
            </p>
            <div className="flex items-center gap-3 mb-3">
            <Mascot expression="happy" size="sm" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Flashcards</h1>
          </div>
          </header>

          {stats.mastered === 0 && stats.learning === 0 && stats.dueToday === 0 && (
            <div className="mb-6 bg-accent-soft rounded-2xl p-5 flex items-start gap-3">
              <Sparkles size={20} strokeWidth={2} className="text-accent shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-base font-bold text-accent mb-1">Comença amb 10 paraules noves</p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Cada paraula que reveses torna a aparèixer segons el que la recordes. En 7 dies ja tindràs una base sòlida.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-8">
            <StatCard label="Dominades" value={stats.mastered} tone="success" />
            <StatCard label="Aprenent" value={stats.learning} tone="warning" />
            <StatCard label="Noves" value={stats.new} tone="accent" />
            <StatCard label="Per repassar avui" value={stats.dueToday} tone="error" />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-ink-muted mb-3 uppercase tracking-widest">
              Filtra per unitat
            </label>
            <div className="flex flex-wrap gap-2">
              <UnitChip selected={selectedUnit === null} onClick={() => setSelectedUnit(null)}>
                Totes
              </UnitChip>
              {units.map((u) => (
                <UnitChip
                  key={u.id}
                  selected={selectedUnit === u.id}
                  onClick={() => setSelectedUnit(u.id)}
                >
                  {u.id}. {u.title}
                </UnitChip>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {stats.mastered === 0 && stats.learning === 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => startSession(true)}
                  className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark inline-flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} strokeWidth={2} aria-hidden="true" />
                  Comença amb paraules noves
                </button>
                <button
                  type="button"
                  onClick={() => startSession(false)}
                  className="w-full h-14 rounded-2xl bg-paper text-ink text-base font-extrabold uppercase tracking-wider btn-3d border-line-strong"
                >
                  Començar sessió mixta
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => startSession(false)}
                  className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
                >
                  Començar sessió
                </button>
                <button
                  type="button"
                  onClick={() => startSession(true)}
                  className="w-full h-14 rounded-2xl bg-paper text-ink text-base font-extrabold uppercase tracking-wider btn-3d border-line-strong"
                >
                  Només noves
                </button>
              </>
            )}
          </div>

          {stats.total > 0 && (
            <p className="mt-6 text-center text-sm text-ink-muted">
              {stats.total} paraules en total
            </p>
          )}
        </div>
      )}

      {view === 'session' && currentCard && (
        <div>
          <NoHeartsModal open={showNoHearts} onClose={() => setShowNoHearts(false)} />
          <div className="flex items-center justify-end mb-3">
            <HeaderStats />
          </div>
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => { refreshStats(); setView('home') }}
              aria-label="Tornar"
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg text-ink-soft hover:bg-paper-2 hover:text-ink transition-colors"
            >
              <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
            </button>
            <div className="flex-1">
              <div className="h-1.5 bg-paper-3 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={currentIdx + 1}
                aria-valuemin={0}
                aria-valuemax={sessionCards.length}
              >
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${((currentIdx + 1) / sessionCards.length) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-semibold text-ink-muted tabular-nums min-w-[48px] text-right">
              {currentIdx + 1}/{sessionCards.length}
            </span>
          </div>

          <div className="perspective-[1000px] mb-6">
            <div
              onClick={() => !flipped && setFlipped(true)}
              className={cn(
                'relative w-full min-h-[340px] cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]',
                flipped && '[transform:rotateY(180deg)]',
              )}
            >
              <div className="absolute inset-0 rounded-3xl bg-paper-2 border-2 border-line flex flex-col items-center justify-center p-8 [backface-visibility:hidden]">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-semibold text-ink-muted uppercase tracking-wider">
                    {currentCard.unitTitle}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-ink-subtle" aria-hidden="true" />
                  <span className="text-sm font-semibold text-ink-muted uppercase tracking-wider">
                    {currentCard.category}
                  </span>
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-ink text-center leading-tight">
                  {currentCard.item.catalan}
                </p>
                {!flipped && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFlipped(true) }}
                    className="mt-8 px-6 h-11 rounded-full bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
                  >
                    Girar
                  </button>
                )}
              </div>

              <div className="absolute inset-0 rounded-3xl bg-paper border-2 border-line flex flex-col items-center justify-center p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <p className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  Traducció
                </p>
                <p className="text-2xl md:text-3xl font-extrabold text-ink text-center mb-4">
                  {currentCard.item.spanish}
                </p>

                {currentCard.item.pronunciation && (
                  <p className="text-base text-ink-muted mb-2 italic">
                    /{currentCard.item.pronunciation}/
                  </p>
                )}

                {currentCard.item.example && (
                  <div className="mt-2 px-4 py-3 rounded-xl bg-paper-2 max-w-full">
                    <p className="text-sm text-ink-soft text-center leading-relaxed">
                      {currentCard.item.example}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); speakCatalan(currentCard.item.catalan) }}
                  aria-label="Escoltar pronunciació"
                  className="mt-5 w-12 h-12 rounded-full bg-accent-soft text-accent flex items-center justify-center hover:bg-accent hover:text-ink-inverse transition-colors"
                >
                  <Volume2 size={20} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {flipped && !rated && (
            <div className="grid grid-cols-4 gap-2">
              <RatingButton label="No ho sé" tone="error" quality={1} onRate={rateCard} />
              <RatingButton label="Difícil" tone="warning" quality={3} onRate={rateCard} />
              <RatingButton label="Bé" tone="success" quality={4} onRate={rateCard} />
              <RatingButton label="Fàcil" tone="accent" quality={5} onRate={rateCard} />
            </div>
          )}
        </div>
      )}

      {view === 'results' && (
        <div className="text-center">
          <ResultsScore
            score={correctCount}
            total={sessionResults.length}
            title="Sessió completada!"
            subtitle={`${correctCount} correctes de ${sessionResults.length}`}
          />

          <div className="grid grid-cols-2 gap-3 max-w-[360px] mx-auto my-8">
            <BreakdownCard
              count={sessionResults.filter((r) => r.quality >= 4).length}
              label="Bé / Fàcil"
              tone="success"
            />
            <BreakdownCard
              count={sessionResults.filter((r) => r.quality === 3).length}
              label="Difícil"
              tone="warning"
            />
            <BreakdownCard
              count={sessionResults.filter((r) => r.quality < 3).length}
              label="No ho sé"
              tone="error"
            />
            <BreakdownCard count={sessionResults.length} label="Total" tone="accent" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => startSession(false)}
              className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
            >
              Continuar
            </button>
            <button
              type="button"
              onClick={() => { refreshStats(); setView('home') }}
              className="w-full h-14 rounded-2xl bg-paper text-ink text-base font-extrabold uppercase tracking-wider btn-3d border-line-strong"
            >
              Tornar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type Tone = 'success' | 'warning' | 'error' | 'accent'

function StatCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const color: Record<Tone, string> = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    accent: 'text-accent',
  }
  return (
    <div className="rounded-2xl bg-paper-2 border border-line p-5">
      <p className={cn('text-3xl font-extrabold leading-none tabular-nums', color[tone])}>
        {value}
      </p>
      <p className="text-sm font-semibold text-ink-muted mt-2 uppercase tracking-wide">
        {label}
      </p>
    </div>
  )
}

function UnitChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-11 px-4 rounded-full text-sm font-semibold transition-colors',
        selected
          ? 'bg-primary text-white'
          : 'bg-paper-3 text-ink-soft hover:bg-paper-4 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function RatingButton({
  label,
  tone,
  quality,
  onRate,
}: {
  label: string
  tone: Tone
  quality: Quality
  onRate: (q: Quality) => void
}) {
  const bg: Record<Tone, string> = {
    error: 'bg-error hover:opacity-90',
    warning: 'bg-warning hover:opacity-90',
    success: 'bg-success hover:opacity-90',
    accent: 'bg-accent hover:bg-accent-hover',
  }
  return (
    <button
      type="button"
      onClick={() => onRate(quality)}
      className={cn(
        'h-14 rounded-2xl text-sm font-semibold text-ink-inverse transition-all active:scale-[0.97]',
        bg[tone],
      )}
    >
      {label}
    </button>
  )
}

function BreakdownCard({
  count,
  label,
  tone,
}: {
  count: number
  label: string
  tone: Tone
}) {
  const bg: Record<Tone, string> = {
    success: 'bg-success-soft',
    warning: 'bg-warning-soft',
    error: 'bg-error-soft',
    accent: 'bg-accent-soft',
  }
  const fg: Record<Tone, string> = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    accent: 'text-accent',
  }
  return (
    <div className={cn('rounded-2xl p-5', bg[tone])}>
      <p className={cn('text-3xl font-extrabold tabular-nums', fg[tone])}>{count}</p>
      <p className={cn('text-sm font-semibold mt-1', fg[tone], 'opacity-80')}>{label}</p>
    </div>
  )
}
