'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { units } from '@/data/units'
import type { VocabularyItem } from '@/data/units'
import {
  getCardStats,
  getDueCards,
  getNewCards,
  reviewCard,
  getWordIdsForUnit,
} from '@/lib/spacedRepetition'
import { shuffle, speakCatalan } from '@/lib/utils'
import { recordError } from '@/lib/errorLog'

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

  // Session state
  const [sessionCards, setSessionCards] = useState<FlashcardData[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [rated, setRated] = useState(false)
  const [sessionResults, setSessionResults] = useState<{ wordId: string; quality: Quality }[]>([])

  // Load stats
  const refreshStats = useCallback(() => {
    setStats(getCardStats())
  }, [])

  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  // ── Build session ─────────────────────────────────────────────────

  const startSession = useCallback(
    (onlyNew: boolean) => {
      const MAX_SESSION = 20

      let cardIds: string[] = []

      if (onlyNew) {
        const newIds = getNewCards(selectedUnit ?? undefined, MAX_SESSION)
        cardIds = shuffle(newIds)
      } else {
        // Due cards first, then new cards to fill
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
    [selectedUnit]
  )

  // ── Rate card ─────────────────────────────────────────────────────

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
      }

      // Auto-advance after short delay
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
    [sessionCards, currentIdx, refreshStats]
  )

  // ── Results calculations ──────────────────────────────────────────

  const correctCount = useMemo(
    () => sessionResults.filter((r) => r.quality >= 3).length,
    [sessionResults]
  )

  // ── Current card ──────────────────────────────────────────────────

  const currentCard = sessionCards[currentIdx] ?? null

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="px-5 md:px-10 pt-8 pb-44 md:pb-12 max-w-[500px] mx-auto">
      {/* ═══ HOME VIEW ═══ */}
      {view === 'home' && (
        <div>
          <h1 className="text-[32px] font-extrabold text-[#1a1a1a] leading-tight mb-6">
            Flashcards
          </h1>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <StatCard label="Dominades" value={stats.mastered} color="#22C55E" />
            <StatCard label="Aprenent" value={stats.learning} color="#F59E0B" />
            <StatCard label="Noves" value={stats.new} color="#8B5CF6" />
            <StatCard label="Per repassar avui" value={stats.dueToday} color="#EF4444" />
          </div>

          {/* Unit filter */}
          <div className="mb-6">
            <label className="block text-[13px] font-bold text-[#888] mb-2 uppercase tracking-wide">
              Filtra per unitat
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedUnit(null)}
                className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all min-h-[44px] ${
                  selectedUnit === null
                    ? 'bg-[#1a1a1a] text-white'
                    : 'bg-[#F5F5F5] text-[#555] hover:bg-[#EBEBEB]'
                }`}
              >
                Totes
              </button>
              {units.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUnit(u.id)}
                  className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all min-h-[44px] ${
                    selectedUnit === u.id
                      ? 'bg-[#1a1a1a] text-white'
                      : 'bg-[#F5F5F5] text-[#555] hover:bg-[#EBEBEB]'
                  }`}
                >
                  {u.title}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={() => startSession(false)}
              className="w-full py-4 rounded-full bg-[#1a1a1a] text-white text-[15px] font-bold transition-all hover:bg-[#333] active:scale-[0.98] min-h-[52px]"
            >
              Començar sessió
            </button>
            <button
              onClick={() => startSession(true)}
              className="w-full py-4 rounded-full bg-[#F5F5F5] text-[#1a1a1a] text-[15px] font-bold transition-all hover:bg-[#EBEBEB] active:scale-[0.98] min-h-[52px]"
            >
              Només noves
            </button>
          </div>

          {stats.total > 0 && (
            <p className="mt-6 text-center text-[13px] text-[#999]">
              {stats.total} paraules en total
            </p>
          )}
        </div>
      )}

      {/* ═══ SESSION VIEW ═══ */}
      {view === 'session' && currentCard && (
        <div>
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => {
                refreshStats()
                setView('home')
              }}
              className="text-[#999] hover:text-[#1a1a1a] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Tornar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <div className="h-[6px] bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1a1a1a] rounded-full transition-all duration-500"
                  style={{ width: `${((currentIdx + 1) / sessionCards.length) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-[13px] font-bold text-[#999] tabular-nums min-w-[40px] text-right">
              {currentIdx + 1}/{sessionCards.length}
            </span>
          </div>

          {/* Card */}
          <div className="perspective-[1000px] mb-6">
            <div
              onClick={() => !flipped && setFlipped(true)}
              className={`relative w-full min-h-[320px] cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${
                flipped ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              {/* Front */}
              <div className="absolute inset-0 rounded-3xl bg-[#F8F8F8] flex flex-col items-center justify-center p-8 [backface-visibility:hidden]">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[11px] font-bold text-[#BBB] uppercase tracking-wider">
                    {currentCard.unitTitle}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[#DDD]" />
                  <span className="text-[11px] font-bold text-[#BBB] uppercase tracking-wider">
                    {currentCard.category}
                  </span>
                </div>
                <p className="text-[28px] font-extrabold text-[#1a1a1a] text-center leading-tight">
                  {currentCard.item.catalan}
                </p>
                {!flipped && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setFlipped(true)
                    }}
                    className="mt-8 px-6 py-2.5 rounded-full bg-[#1a1a1a] text-white text-[13px] font-bold transition-all hover:bg-[#333] active:scale-[0.97] min-h-[44px]"
                  >
                    Girar
                  </button>
                )}
              </div>

              {/* Back */}
              <div className="absolute inset-0 rounded-3xl bg-white border-2 border-[#F0F0F0] flex flex-col items-center justify-center p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <p className="text-[13px] font-bold text-[#BBB] uppercase tracking-wider mb-2">
                  Traducció
                </p>
                <p className="text-[24px] font-extrabold text-[#1a1a1a] text-center mb-4">
                  {currentCard.item.spanish}
                </p>

                {currentCard.item.pronunciation && (
                  <p className="text-[14px] text-[#888] mb-2 italic">
                    /{currentCard.item.pronunciation}/
                  </p>
                )}

                {currentCard.item.example && (
                  <div className="mt-2 px-4 py-3 rounded-2xl bg-[#F8F8F8] max-w-full">
                    <p className="text-[13px] text-[#666] text-center leading-relaxed">
                      {currentCard.item.example}
                    </p>
                  </div>
                )}

                {/* Audio button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    speakCatalan(currentCard.item.catalan)
                  }}
                  className="mt-4 w-11 h-11 rounded-full bg-[#F5F5F5] flex items-center justify-center hover:bg-[#EBEBEB] transition-colors"
                  aria-label="Escoltar pronunciació"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Rating buttons — only visible when flipped */}
          {flipped && !rated && (
            <div className="grid grid-cols-4 gap-2">
              <RatingButton label="No ho sé" color="#EF4444" quality={1} onRate={rateCard} />
              <RatingButton label="Difícil" color="#F59E0B" quality={3} onRate={rateCard} />
              <RatingButton label="Bé" color="#22C55E" quality={4} onRate={rateCard} />
              <RatingButton label="Fàcil" color="#3B82F6" quality={5} onRate={rateCard} />
            </div>
          )}
        </div>
      )}

      {/* ═══ RESULTS VIEW ═══ */}
      {view === 'results' && (
        <div className="text-center">
          <div className="mb-8 mt-4">
            <div className="w-20 h-20 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-5">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-[28px] font-extrabold text-[#1a1a1a] mb-2">Sessió completada!</h2>
            <p className="text-[15px] text-[#888]">
              {correctCount} correctes de {sessionResults.length}
            </p>
          </div>

          {/* Score bar */}
          <div className="mb-8">
            <div className="h-3 bg-[#F0F0F0] rounded-full overflow-hidden max-w-[280px] mx-auto">
              <div
                className="h-full bg-[#22C55E] rounded-full transition-all duration-700"
                style={{
                  width: `${sessionResults.length > 0 ? (correctCount / sessionResults.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-3 max-w-[320px] mx-auto mb-10">
            <div className="rounded-2xl bg-[#F0FDF4] p-4">
              <p className="text-[24px] font-extrabold text-[#22C55E]">
                {sessionResults.filter((r) => r.quality >= 4).length}
              </p>
              <p className="text-[12px] font-bold text-[#22C55E]/70">Bé / Fàcil</p>
            </div>
            <div className="rounded-2xl bg-[#FFF7ED] p-4">
              <p className="text-[24px] font-extrabold text-[#F59E0B]">
                {sessionResults.filter((r) => r.quality === 3).length}
              </p>
              <p className="text-[12px] font-bold text-[#F59E0B]/70">Difícil</p>
            </div>
            <div className="rounded-2xl bg-[#FEF2F2] p-4">
              <p className="text-[24px] font-extrabold text-[#EF4444]">
                {sessionResults.filter((r) => r.quality < 3).length}
              </p>
              <p className="text-[12px] font-bold text-[#EF4444]/70">No ho sé</p>
            </div>
            <div className="rounded-2xl bg-[#F5F3FF] p-4">
              <p className="text-[24px] font-extrabold text-[#8B5CF6]">{sessionResults.length}</p>
              <p className="text-[12px] font-bold text-[#8B5CF6]/70">Total</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => startSession(false)}
              className="w-full py-4 rounded-full bg-[#1a1a1a] text-white text-[15px] font-bold transition-all hover:bg-[#333] active:scale-[0.98] min-h-[52px]"
            >
              Continuar
            </button>
            <button
              onClick={() => {
                refreshStats()
                setView('home')
              }}
              className="w-full py-4 rounded-full bg-[#F5F5F5] text-[#1a1a1a] text-[15px] font-bold transition-all hover:bg-[#EBEBEB] active:scale-[0.98] min-h-[52px]"
            >
              Tornar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFA] p-4 flex flex-col items-start">
      <p className="text-[28px] font-extrabold leading-none" style={{ color }}>
        {value}
      </p>
      <p className="text-[12px] font-bold text-[#999] mt-1 uppercase tracking-wide">{label}</p>
    </div>
  )
}

function RatingButton({
  label,
  color,
  quality,
  onRate,
}: {
  label: string
  color: string
  quality: Quality
  onRate: (q: Quality) => void
}) {
  return (
    <button
      onClick={() => onRate(quality)}
      className="py-3 rounded-2xl text-[12px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.95] min-h-[52px]"
      style={{ backgroundColor: color }}
    >
      {label}
    </button>
  )
}
