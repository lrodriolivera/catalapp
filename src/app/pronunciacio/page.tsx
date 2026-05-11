'use client'

import { useCallback, useEffect, useState } from 'react'
import { Volume2, Mic, ChevronDown, Loader2, Sparkles, Lightbulb } from 'lucide-react'
import { units } from '@/data/units'
import { addXP } from '@/lib/progress'
import UnitSelector from '@/components/UnitSelector'
import { useSpeechRecognition } from '@/lib/useSpeechRecognition'
import { comparePronunciation, type PronunciationResult } from '@/lib/pronunciation'
import { callSonnet } from '@/lib/api'
import { recordError } from '@/lib/errorLog'
import { cn } from '@/lib/utils'
import { Mascot } from '@/components/ui/Mascot'

interface PronunciationWord {
  catalan: string
  spanish: string
  pronunciation?: string
  example?: string
}

interface PronunciationCategory {
  title: string
  unitId: number
  words: PronunciationWord[]
}

interface PhonemeError {
  phoneme: string
  word: string
  explanation: string
  tip: string
}

interface PhoneticAnalysis {
  overallScore: number
  phonemeErrors: PhonemeError[]
  tip: string
}

interface Attempt {
  targetKey: string
  target: string
  transcript: string
  comparison: PronunciationResult
  analysis?: PhoneticAnalysis
  analysisLoading?: boolean
}

const allSections: PronunciationCategory[] = units.flatMap((u) =>
  Object.entries(u.vocabulary).map(([category, items]) => ({
    title: category,
    unitId: u.id,
    words: items.map((item) => ({
      catalan: item.catalan,
      spanish: item.spanish,
      pronunciation: item.pronunciation,
      example: item.example,
    })),
  })),
)

function scoreTone(score: number): 'success' | 'warning' | 'error' {
  if (score >= 70) return 'success'
  if (score >= 40) return 'warning'
  return 'error'
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Perfecte!'
  if (score >= 70) return 'Molt bé!'
  if (score >= 40) return 'Quasi!'
  return 'Torna-ho a provar'
}

export default function PronunciacioPage() {
  const [selectedUnit, setSelectedUnit] = useState(0)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [speakingKey, setSpeakingKey] = useState<string | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [hasTTS, setHasTTS] = useState(false)

  useEffect(() => {
    setHasTTS(typeof speechSynthesis !== 'undefined')
  }, [])

  const handleResult = useCallback(
    (text: string) => {
      if (!activeKey) return
      setAttempt((prev) => {
        if (!prev || prev.targetKey !== activeKey) return prev
        const comparison = comparePronunciation(prev.target, text)
        if (comparison.score >= 70) addXP(5)
        else
          recordError({
            context: prev.target,
            userAnswer: text,
            correctAnswer: prev.target,
            source: 'pronunciacio',
            category: 'pronunciacio',
          })
        return { ...prev, transcript: text, comparison }
      })
    },
    [activeKey],
  )

  const sr = useSpeechRecognition({ lang: 'ca-ES', onResult: handleResult })
  const unitSections = allSections.filter((s) => s.unitId === units[selectedUnit]?.id)

  const speak = useCallback((text: string, key: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setSpeakingKey(key)
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ca-ES'
    utterance.rate = 0.85
    const voices = window.speechSynthesis.getVoices()
    const catalanVoice = voices.find((v) => v.lang === 'ca-ES' || v.lang.startsWith('ca'))
    if (catalanVoice) utterance.voice = catalanVoice
    utterance.onend = () => setSpeakingKey(null)
    utterance.onerror = () => setSpeakingKey(null)
    window.speechSynthesis.speak(utterance)
  }, [])

  const startAttempt = useCallback(
    (key: string, target: string) => {
      if (sr.isRecording) {
        sr.stop()
        return
      }
      setActiveKey(key)
      setAttempt({
        targetKey: key,
        target,
        transcript: '',
        comparison: { words: [], score: 0, normalizedTarget: target, normalizedTranscript: '' },
      })
      sr.start()
    },
    [sr],
  )

  const requestPhoneticAnalysis = useCallback(async () => {
    if (!attempt || attempt.analysisLoading || attempt.analysis) return
    setAttempt((prev) => (prev ? { ...prev, analysisLoading: true } : prev))
    try {
      const result = await callSonnet('analyze_pronunciation', {
        target: attempt.target,
        transcription: attempt.transcript,
      })
      if (result && typeof result === 'object') {
        const analysis: PhoneticAnalysis = {
          overallScore: Number(result.overallScore) || attempt.comparison.score,
          phonemeErrors: Array.isArray(result.phonemeErrors) ? result.phonemeErrors : [],
          tip: typeof result.tip === 'string' ? result.tip : '',
        }
        for (const err of analysis.phonemeErrors) {
          if (err.word && err.phoneme) {
            recordError({
              context: attempt.target,
              userAnswer: attempt.transcript,
              correctAnswer: err.word,
              source: 'pronunciacio',
              category: 'pronunciacio',
              rule: `phoneme-${err.phoneme}`,
            })
          }
        }
        setAttempt((prev) => (prev ? { ...prev, analysis, analysisLoading: false } : prev))
      } else {
        setAttempt((prev) => (prev ? { ...prev, analysisLoading: false } : prev))
      }
    } catch {
      setAttempt((prev) => (prev ? { ...prev, analysisLoading: false } : prev))
    }
  }, [attempt])

  const toneColor: Record<'success' | 'warning' | 'error', string> = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 md:px-8 py-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
          Pràctica
        </p>
        <div className="flex items-center gap-3 mb-3">
            <Mascot expression="happy" size="sm" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight ">
          Pronunciació
        </h1>
          </div>
        <p className="text-lg text-ink-soft">
          Escolta, repeteix i millora la teva pronunciació.
        </p>
      </header>

      <UnitSelector
        selectedUnit={selectedUnit}
        onSelect={(i) => {
          setSelectedUnit(i)
          setExpandedSection(null)
          setAttempt(null)
          setActiveKey(null)
        }}
      />

      {!sr.supported && (
        <div className="bg-warning-soft rounded-2xl px-6 py-4 mb-6">
          <p className="text-base text-warning leading-relaxed">
            El teu navegador no suporta el reconeixement de veu. Podràs escoltar les paraules, però no gravar-te. Prova amb Chrome o Edge.
          </p>
        </div>
      )}

      <div className="bg-accent-soft rounded-2xl px-6 py-4 mb-10 flex gap-3 items-start">
        <Lightbulb size={18} strokeWidth={2} className="text-accent shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-base text-accent leading-relaxed">
          Prem el botó de so per escoltar i el de micròfon per gravar-te. Comparem paraula per paraula.
        </p>
      </div>

      <div className="space-y-3">
        {unitSections.map((section) => {
          const sectionKey = `${section.unitId}-${section.title}`
          const isExpanded = expandedSection === sectionKey
          return (
            <div
              key={sectionKey}
              className={cn(
                'rounded-2xl overflow-hidden border transition-colors',
                isExpanded ? 'bg-paper border-accent/40' : 'bg-paper border-line',
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setExpandedSection(isExpanded ? null : sectionKey)
                  setAttempt(null)
                  setActiveKey(null)
                }}
                aria-expanded={isExpanded}
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-paper-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-3 h-7 rounded-full bg-accent-soft text-accent text-sm font-semibold">
                    {section.title}
                  </span>
                  <span className="text-sm text-ink-muted">{section.words.length} paraules</span>
                </div>
                <ChevronDown
                  size={18}
                  strokeWidth={2}
                  className={cn(
                    'text-accent transition-transform duration-200',
                    isExpanded && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>

              {isExpanded && (
                <div className="px-3 pb-5 border-t border-line">
                  <div className="space-y-2 mt-3">
                    {section.words.map((word, wi) => {
                      const itemKey = `${sectionKey}-${wi}`
                      const target = word.example || word.catalan
                      const isRecordingHere = sr.isRecording && activeKey === itemKey
                      const isSpeakingHere = speakingKey === itemKey
                      return (
                        <div
                          key={wi}
                          className="bg-paper-2 rounded-xl flex items-center gap-3 px-4 md:px-5 py-3 md:py-4"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-base md:text-lg font-bold text-ink">
                              {word.catalan}
                            </p>
                            <p className="text-base text-ink-soft">{word.spanish}</p>
                            {word.pronunciation && (
                              <p className="text-sm text-ink-muted font-mono mt-0.5">
                                {word.pronunciation}
                              </p>
                            )}
                          </div>

                          {hasTTS && (
                            <button
                              type="button"
                              onClick={() => speak(target, itemKey)}
                              disabled={isSpeakingHere}
                              aria-label={`Escolta ${word.catalan}`}
                              className={cn(
                                'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors',
                                isSpeakingHere
                                  ? 'bg-primary text-white'
                                  : 'bg-accent-soft text-accent hover:bg-accent hover:text-ink-inverse',
                              )}
                            >
                              <Volume2 size={18} strokeWidth={2} aria-hidden="true" />
                            </button>
                          )}

                          {sr.supported && (
                            <button
                              type="button"
                              onClick={() => startAttempt(itemKey, target)}
                              aria-label={
                                isRecordingHere
                                  ? `Aturar gravació de ${word.catalan}`
                                  : `Grava ${word.catalan}`
                              }
                              className={cn(
                                'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors',
                                isRecordingHere
                                  ? 'bg-error text-ink-inverse animate-pulse'
                                  : 'bg-error-soft text-error hover:bg-error hover:text-ink-inverse',
                              )}
                            >
                              <Mic size={18} strokeWidth={2} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {attempt && attempt.targetKey.startsWith(sectionKey) && attempt.transcript && (
                    <div className="mt-5 bg-paper rounded-2xl px-5 py-5 border border-line">
                      <div className="flex items-center justify-between mb-4">
                        <p className={cn('text-lg font-extrabold', toneColor[scoreTone(attempt.comparison.score)])}>
                          {scoreLabel(attempt.comparison.score)}
                        </p>
                        <span className={cn('text-lg font-extrabold tabular-nums', toneColor[scoreTone(attempt.comparison.score)])}>
                          {attempt.comparison.score}%
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {attempt.comparison.words.map((w, i) => (
                          <span
                            key={i}
                            className={cn(
                              'px-3 py-1 rounded-full text-sm font-bold',
                              w.ok
                                ? 'bg-success-soft text-success'
                                : 'bg-error-soft text-error',
                            )}
                          >
                            {w.word}
                          </span>
                        ))}
                      </div>

                      <p className="text-sm text-ink-soft mb-4">
                        <span className="font-semibold">Has dit:</span> &ldquo;{attempt.transcript}&rdquo;
                      </p>

                      {attempt.comparison.score < 90 && !attempt.analysis && (
                        <button
                          type="button"
                          onClick={requestPhoneticAnalysis}
                          disabled={!!attempt.analysisLoading}
                          className="inline-flex items-center gap-2 bg-primary text-white text-sm font-extrabold uppercase tracking-wider px-5 h-11 rounded-xl btn-3d border-primary-dark disabled:opacity-50"
                        >
                          {attempt.analysisLoading ? (
                            <>
                              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                              Analitzant...
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} aria-hidden="true" />
                              Per què he fallat?
                            </>
                          )}
                        </button>
                      )}

                      {attempt.analysis && (
                        <div className="mt-4 bg-warning-soft rounded-2xl p-5">
                          {attempt.analysis.phonemeErrors.length > 0 ? (
                            <div className="space-y-4">
                              {attempt.analysis.phonemeErrors.map((err, i) => (
                                <div key={i}>
                                  <p className="text-sm font-extrabold text-warning mb-1">
                                    &ldquo;{err.word}&rdquo; · fonema {err.phoneme}
                                  </p>
                                  <p className="text-base text-ink mb-1">{err.explanation}</p>
                                  <p className="text-sm text-warning font-semibold inline-flex items-center gap-1.5">
                                    <Lightbulb size={14} strokeWidth={2} aria-hidden="true" /> {err.tip}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-base text-ink">Sense errors de fonema detectats.</p>
                          )}
                          {attempt.analysis.tip && (
                            <p className="text-sm text-warning mt-4 pt-4 border-t border-warning/30">
                              {attempt.analysis.tip}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {unitSections.length === 0 && (
        <div className="text-center py-16">
          <p className="text-base text-ink-soft">No hi ha contingut per aquesta unitat.</p>
        </div>
      )}
    </div>
  )
}
