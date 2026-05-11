'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Flame,
  CheckCircle2,
  BookOpen,
  BookOpenCheck,
  Share2,
  Check,
  Lock,
  ArrowRight,
  Trophy,
  Target,
  Crown,
  Star,
  Gem,
  Rocket,
  MessageCircle,
  Headphones,
  Globe,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { getProgress, type UserProgress, getUnitProgress } from '@/lib/progress'
import { getAllBadges, getBadges, type UserBadges } from '@/lib/badges'
import { units } from '@/data/units'
import {
  getTopWeaknesses,
  getUnclassifiedErrors,
  type ErrorCategory,
  type WeaknessSummary,
} from '@/lib/errorLog'
import { classifyPendingErrors } from '@/lib/errorClassifier'
import { cn } from '@/lib/utils'
import BackLink from '@/components/exercises/ui/BackLink'
import { Mascot } from '@/components/ui/Mascot'

const WEAKNESS_PASTEL: Record<ErrorCategory, string> = {
  ortografia: 'bg-pastel-pink',
  conjugacio: 'bg-pastel-peach',
  genere_nombre: 'bg-pastel-sky',
  lexic: 'bg-pastel-amber',
  ordre: 'bg-pastel-mint',
  pronunciacio: 'bg-paper-2',
  altre: 'bg-paper-2',
}

type BadgeTone = 'accent' | 'success' | 'warning' | 'error' | 'pink' | 'sky'

const BADGE_ICONS: Record<string, { Icon: LucideIcon; tone: BadgeTone }> = {
  first_exercise:     { Icon: Target,         tone: 'accent'  },
  ten_exercises:      { Icon: BookOpenCheck,  tone: 'accent'  },
  fifty_exercises:    { Icon: Trophy,         tone: 'warning' },
  hundred_exercises:  { Icon: Crown,          tone: 'warning' },
  streak_3:           { Icon: Flame,          tone: 'warning' },
  streak_7:           { Icon: Star,           tone: 'warning' },
  streak_30:          { Icon: Sparkles,       tone: 'accent'  },
  xp_100:             { Icon: Gem,            tone: 'sky'     },
  xp_500:             { Icon: Zap,            tone: 'sky'     },
  xp_1000:            { Icon: Rocket,         tone: 'pink'    },
  perfect_score:      { Icon: CheckCircle2,   tone: 'success' },
  all_unit1:          { Icon: Check,          tone: 'success' },
  first_conversation: { Icon: MessageCircle,  tone: 'accent'  },
  first_dialogue:     { Icon: Headphones,     tone: 'accent'  },
  polyglot:           { Icon: Globe,          tone: 'success' },
}

const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  accent:  'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error:   'bg-error-soft text-error',
  pink:    'bg-pastel-pink text-error',
  sky:     'bg-pastel-sky text-accent',
}

function getUnitBestScore(unitId: number, progress: UserProgress): string | null {
  const key = `ex-${unitId}`
  const score = progress.lessonScores[key]
  if (!score) return null
  return `${score.score}/${score.total}`
}

export default function Estadistiques() {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [badges, setBadges] = useState<UserBadges>({ earned: {} })
  const [shared, setShared] = useState(false)
  const [weaknesses, setWeaknesses] = useState<WeaknessSummary[]>([])

  useEffect(() => {
    setProgress(getProgress())
    setBadges(getBadges())
    setWeaknesses(getTopWeaknesses(3))

    if (getUnclassifiedErrors().length > 0) {
      classifyPendingErrors().then((n) => {
        if (n > 0) setWeaknesses(getTopWeaknesses(3))
      })
    }
  }, [])

  const xp = progress?.xp ?? 0
  const streak = progress?.streak ?? 0
  const exerciseCount = progress ? Object.keys(progress.completedExercises).length : 0
  const lessonCount = progress ? Object.keys(progress.lessonScores).length : 0

  const allBadges = getAllBadges()

  async function handleShare() {
    const text = `Estic aprenent català amb CatalApp! Tinc ${xp} XP i una ratxa de ${streak} dies. Prova-la gratis a https://catala.strixai.es`
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    } catch {}
  }

  return (
    <div className="mx-auto w-full max-w-[960px] px-5 md:px-8 py-8 md:py-12">
      <BackLink href="/" label="Tornar" />

      <header className="mt-4 mb-10">
        <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
          El teu progrés
        </p>
        <div className="flex items-center gap-3 mb-3">
            <Mascot expression="happy" size="sm" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
          Estadístiques
        </h1>
          </div>
        <p className="text-lg text-ink-soft">
          {xp} XP acumulats · Ratxa de {streak} {streak === 1 ? 'dia' : 'dies'}
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
        <StatTile Icon={Sparkles} tone="accent" value={xp} label="XP total" />
        <StatTile Icon={Flame} tone="warning" value={streak} label="Ratxa actual" />
        <StatTile Icon={CheckCircle2} tone="success" value={exerciseCount} label="Exercicis" />
        <StatTile Icon={BookOpen} tone="accent" value={lessonCount} label="Lliçons" />
      </div>

      {weaknesses.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl md:text-2xl font-extrabold text-ink mb-5">
            Àrees a millorar
          </h2>
          <div className="space-y-3">
            {weaknesses.map((w) => (
              <article
                key={w.category}
                className={cn('rounded-2xl p-5 md:p-6', WEAKNESS_PASTEL[w.category])}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-lg font-extrabold text-ink">{w.label}</p>
                    <p className="text-sm text-ink-soft font-medium mt-0.5">
                      {w.count} {w.count === 1 ? 'error registrat' : 'errors registrats'}
                    </p>
                  </div>
                  <Link
                    href="/gramatica"
                    className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-white text-sm font-extrabold uppercase tracking-wider px-4 h-10 rounded-xl btn-3d border-primary-dark"
                  >
                    Reforça-ho
                    <ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />
                  </Link>
                </div>
                {w.recentExamples[0] && (
                  <p className="text-sm text-ink font-medium mt-3 leading-relaxed">
                    <span className="text-ink-muted">Exemple: </span>
                    <span className="line-through text-error">{w.recentExamples[0].userAnswer}</span>
                    <span className="mx-1.5 text-ink-muted">→</span>
                    <span className="text-success font-bold">
                      {w.recentExamples[0].correctAnswer}
                    </span>
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="text-xl md:text-2xl font-extrabold text-ink mb-5">
          Progrés per unitat
        </h2>
        <div className="space-y-3">
          {units.map((unit) => {
            const pct = progress ? getUnitProgress(unit.id, progress) : 0
            const score = progress ? getUnitBestScore(unit.id, progress) : null
            const done = pct >= 100
            return (
              <div
                key={unit.id}
                className="bg-paper border-2 border-line rounded-xl px-5 py-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold text-ink">
                    {unit.id}. {unit.subtitle}
                  </span>
                  <span className="text-sm text-ink-muted font-semibold tabular-nums">
                    {pct}%{score ? ` · ${score}` : ''}
                  </span>
                </div>
                <div
                  className="w-full h-1.5 bg-paper-3 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      done ? 'bg-success' : pct > 0 ? 'bg-accent' : 'bg-paper-3',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl md:text-2xl font-extrabold text-ink mb-5 inline-flex items-center gap-2">
          <Trophy size={22} strokeWidth={2} className="text-accent" aria-hidden="true" />
          Medalles
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {allBadges.map((badge) => {
            const earnedDate = badges.earned[badge.id]
            const isEarned = !!earnedDate
            const mapping = BADGE_ICONS[badge.id]
            const Icon = mapping?.Icon ?? Target
            const toneClass = mapping ? BADGE_TONE_CLASS[mapping.tone] : BADGE_TONE_CLASS.accent
            return (
              <div
                key={badge.id}
                className={cn(
                  'rounded-2xl p-4 text-center border transition-all',
                  isEarned
                    ? 'bg-paper border-line'
                    : 'bg-paper-2 border-line opacity-60',
                )}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2',
                    isEarned ? toneClass : 'bg-paper-3 text-ink-subtle',
                  )}
                  aria-hidden="true"
                >
                  <Icon size={22} strokeWidth={isEarned ? 2 : 1.75} />
                </span>
                <p className={cn(
                  'text-sm font-bold leading-tight',
                  isEarned ? 'text-ink' : 'text-ink-muted',
                )}>
                  {badge.title}
                </p>
                {isEarned ? (
                  <p className="text-xs text-ink-muted mt-1">
                    {new Date(earnedDate).toLocaleDateString('ca')}
                  </p>
                ) : (
                  <p className="text-xs text-ink-subtle mt-1 inline-flex items-center gap-1 justify-center">
                    <Lock size={10} strokeWidth={2.25} aria-hidden="true" />
                    Bloquejada
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <div className="text-center">
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 bg-primary text-white font-extrabold uppercase tracking-wider btn-3d border-primary-dark text-base rounded-2xl h-14 px-7 hover:bg-ink-soft active:scale-95 transition-all"
        >
          {shared ? (
            <>
              <Check size={18} strokeWidth={2.5} aria-hidden="true" />
              Copiat!
            </>
          ) : (
            <>
              <Share2 size={18} strokeWidth={2} aria-hidden="true" />
              Compartir el meu progrés
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function StatTile({
  Icon,
  tone,
  value,
  label,
}: {
  Icon: LucideIcon
  tone: 'accent' | 'success' | 'warning' | 'error'
  value: number
  label: string
}) {
  const toneBg: Record<string, string> = {
    accent: 'bg-accent-soft text-accent',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    error: 'bg-error-soft text-error',
  }
  return (
    <div className="bg-paper border-2 border-line rounded-2xl p-5 text-center">
      <span className={cn('inline-flex items-center justify-center w-10 h-10 rounded-full mb-3', toneBg[tone])}>
        <Icon size={20} strokeWidth={2} aria-hidden="true" />
      </span>
      <p className="text-2xl md:text-3xl font-extrabold text-ink tabular-nums">{value}</p>
      <p className="text-sm text-ink-muted font-medium mt-1">{label}</p>
    </div>
  )
}
