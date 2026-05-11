'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Play, Pause, Turtle, Rabbit, Languages } from 'lucide-react'
import { dialogues, type Dialogue } from '@/data/dialogues'
import { units } from '@/data/units'
import { cn } from '@/lib/utils'
import BackLink from '@/components/exercises/ui/BackLink'
import { Mascot } from '@/components/ui/Mascot'

export default function DialegsPage() {
  const [selected, setSelected] = useState<Dialogue | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentLine, setCurrentLine] = useState(-1)
  const [showTranslation, setShowTranslation] = useState(true)
  const [speed, setSpeed] = useState<'normal' | 'slow'>('normal')
  const playingRef = useRef(false)
  const currentLineRef = useRef(-1)
  const linesRef = useRef<HTMLDivElement>(null)

  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => {
    currentLineRef.current = currentLine
    if (currentLine >= 0 && linesRef.current) {
      const el = linesRef.current.children[currentLine] as HTMLElement
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentLine])

  const getBestVoice = useCallback(() => {
    if (typeof speechSynthesis === 'undefined') return null
    const v = speechSynthesis.getVoices()
    return (
      v.find((x) => x.lang.startsWith('ca') && x.name.includes('Google')) ||
      v.find((x) => x.lang.startsWith('ca')) ||
      v.find((x) => x.lang === 'es-ES') ||
      null
    )
  }, [])

  useEffect(() => {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.getVoices()
      speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices()
      return () => { speechSynthesis.onvoiceschanged = null }
    }
  }, [])

  const speakLine = useCallback(
    (text: string): Promise<void> =>
      new Promise((resolve) => {
        if (typeof speechSynthesis === 'undefined') {
          resolve()
          return
        }
        speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'ca-ES'
        u.rate = speed === 'slow' ? 0.65 : 0.82
        u.pitch = 1.0
        const v = getBestVoice()
        if (v) u.voice = v
        u.onend = () => resolve()
        u.onerror = () => resolve()
        speechSynthesis.speak(u)
      }),
    [getBestVoice, speed],
  )

  const playAll = useCallback(async () => {
    if (!selected) return
    playingRef.current = true
    setPlaying(true)
    for (let i = 0; i < selected.lines.length; i++) {
      if (!playingRef.current) break
      setCurrentLine(i)
      await speakLine(selected.lines[i].catalan)
      if (playingRef.current) await new Promise((r) => setTimeout(r, speed === 'slow' ? 800 : 500))
    }
    playingRef.current = false
    setPlaying(false)
    setCurrentLine(-1)
  }, [selected, speakLine, speed])

  const stopPlaying = useCallback(() => {
    setPlaying(false)
    playingRef.current = false
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
    setCurrentLine(-1)
  }, [])

  const playSingleLine = useCallback(
    (idx: number) => {
      if (!selected) return
      setCurrentLine(idx)
      speakLine(selected.lines[idx].catalan).then(() => setCurrentLine(-1))
    },
    [selected, speakLine],
  )

  const goBack = useCallback(() => {
    stopPlaying()
    setSelected(null)
  }, [stopPlaying])

  const unitGroups = useMemo(
    () =>
      units
        .map((u) => ({
          unitId: u.id,
          title: u.subtitle,
          items: dialogues.filter((d) => d.unitId === u.id),
        }))
        .filter((g) => g.items.length > 0),
    [],
  )

  // ──────── Selección ────────
  if (!selected) {
    return (
      <div className="mx-auto w-full max-w-[960px] px-5 md:px-8 py-8 md:py-12">
        <header className="mb-10">
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
            Escolta i aprèn
          </p>
          <div className="flex items-center gap-3 mb-3">
            <Mascot expression="happy" size="sm" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight ">
            Diàlegs
          </h1>
          </div>
          <p className="text-lg text-ink-soft max-w-[60ch]">
            Converses reals per escoltar i practicar la pronúncia.
          </p>
        </header>

        <div className="space-y-10">
          {unitGroups.map((group) => (
            <section key={group.unitId}>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent-soft text-accent text-base font-bold tabular-nums">
                  {group.unitId}
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">Unitat {group.unitId}</h2>
                  <p className="text-sm text-ink-muted">{group.title}</p>
                </div>
              </div>

              <ul className="space-y-3">
                {group.items.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(d)}
                      className="group w-full text-left bg-paper border-2 border-line rounded-2xl p-5 transition-colors hover:border-accent/50 hover:bg-paper-2 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className="shrink-0 w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center text-2xl leading-none"
                          aria-hidden="true"
                        >
                          {d.emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-ink">{d.title}</p>
                          <p className="text-sm text-ink-muted">{d.description}</p>
                          <p className="text-sm text-ink-subtle mt-1">
                            {d.speakerA.emoji} {d.speakerA.name} · {d.speakerB.emoji} {d.speakerB.name} · {d.lines.length} línies
                          </p>
                        </div>
                        <Play size={20} className="text-accent shrink-0" aria-hidden="true" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    )
  }

  // ──────── Player ────────
  const dialogueProgress =
    currentLine >= 0 ? ((currentLine + 1) / selected.lines.length) * 100 : 0

  return (
    <div className="mx-auto w-full max-w-[960px] px-5 md:px-8 py-8 md:py-12">
      <BackLink onClick={goBack} label="Tornar als diàlegs" />

      <header className="text-center mb-8 mt-4">
        <span className="text-5xl block mb-3" aria-hidden="true">
          {selected.emoji}
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink mb-1">
          {selected.title}
        </h1>
        <p className="text-base text-ink-soft">{selected.description}</p>
        <p className="text-sm text-ink-muted mt-2">
          {selected.speakerA.emoji} {selected.speakerA.name} &nbsp;·&nbsp; {selected.speakerB.emoji} {selected.speakerB.name}
        </p>
      </header>

      <div className="flex items-center justify-center mb-6">
        <button
          type="button"
          onClick={playing ? stopPlaying : playAll}
          aria-label={playing ? 'Aturar diàleg' : 'Reproduir diàleg'}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-all',
            playing
              ? 'bg-error text-ink-inverse hover:opacity-90'
              : 'bg-primary text-white hover:bg-primary-light',
          )}
        >
          {playing ? (
            <Pause size={26} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <Play size={26} strokeWidth={2.5} className="ml-0.5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
        <button
          type="button"
          onClick={() => setSpeed(speed === 'normal' ? 'slow' : 'normal')}
          aria-pressed={speed === 'slow'}
          className={cn(
            'inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors',
            speed === 'slow'
              ? 'bg-warning-soft text-warning'
              : 'bg-paper-3 text-ink-soft hover:bg-paper-4',
          )}
        >
          {speed === 'slow' ? (
            <Turtle size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Rabbit size={16} strokeWidth={2} aria-hidden="true" />
          )}
          {speed === 'slow' ? 'Lent' : 'Normal'}
        </button>
        <button
          type="button"
          onClick={() => setShowTranslation(!showTranslation)}
          aria-pressed={showTranslation}
          className={cn(
            'inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors',
            showTranslation
              ? 'bg-accent-soft text-accent'
              : 'bg-paper-3 text-ink-soft hover:bg-paper-4',
          )}
        >
          <Languages size={16} strokeWidth={2} aria-hidden="true" />
          {showTranslation ? 'Amb traducció' : 'Sense traducció'}
        </button>
      </div>

      {playing && (
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex-1 bg-paper-3 rounded-full h-1.5 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(dialogueProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progrés del diàleg"
          >
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${dialogueProgress}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-ink-muted tabular-nums">
            {currentLine + 1}/{selected.lines.length}
          </span>
        </div>
      )}

      <div ref={linesRef} className="space-y-3">
        {selected.lines.map((line, i) => {
          const isActive = i === currentLine
          const speaker = line.speaker === 'A' ? selected.speakerA : selected.speakerB
          const isLeft = line.speaker === 'A'

          return (
            <button
              key={i}
              type="button"
              onClick={() => playSingleLine(i)}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`${speaker.name}: ${line.catalan}`}
              className={cn(
                'w-full text-left transition-all rounded-2xl p-4 md:p-5 border',
                isActive
                  ? 'bg-primary text-white border-primary-dark scale-[1.01]'
                  : 'bg-paper border-line hover:border-accent/40 hover:bg-paper-2',
              )}
            >
              <div className={cn('flex gap-3', isLeft ? '' : 'flex-row-reverse text-right')}>
                <span className="text-2xl shrink-0" aria-hidden="true">
                  {speaker.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold mb-1', isActive ? 'text-ink-inverse/70' : 'text-ink-muted')}>
                    {speaker.name}
                  </p>
                  <p className={cn('text-lg font-bold leading-snug', isActive ? 'text-ink-inverse' : 'text-ink')}>
                    {line.catalan}
                  </p>
                  {showTranslation && (
                    <p className={cn('text-base mt-1', isActive ? 'text-ink-inverse/70' : 'text-ink-muted')}>
                      {line.spanish}
                    </p>
                  )}
                </div>
                <span className={cn('shrink-0 self-center', isActive ? 'text-ink-inverse' : 'text-ink-subtle')} aria-hidden="true">
                  <Play size={16} fill="currentColor" />
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={playing ? stopPlaying : playAll}
          aria-label={playing ? 'Aturar diàleg' : 'Reproduir tot el diàleg'}
          className="w-full bg-primary text-white font-extrabold uppercase tracking-wider btn-3d border-primary-dark h-14 rounded-2xl text-base hover:bg-ink-soft transition-colors flex items-center justify-center gap-2"
        >
          {playing ? (
            <>
              <Pause size={18} strokeWidth={2.5} aria-hidden="true" /> Aturar
            </>
          ) : (
            <>
              <Play size={18} strokeWidth={2.5} aria-hidden="true" /> Reproduir tot el diàleg
            </>
          )}
        </button>
      </div>
    </div>
  )
}
