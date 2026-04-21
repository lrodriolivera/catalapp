'use client'

import { useCallback, useEffect, useState } from 'react'
import { units } from '@/data/units'
import { addXP } from '@/lib/progress'
import UnitSelector from '@/components/UnitSelector'
import { useSpeechRecognition } from '@/lib/useSpeechRecognition'
import { comparePronunciation, type PronunciationResult } from '@/lib/pronunciation'
import { callSonnet } from '@/lib/api'
import { recordError } from '@/lib/errorLog'

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
  }))
)

function scoreColor(score: number): string {
  if (score >= 70) return '#059669'
  if (score >= 40) return '#F59E0B'
  return '#C62828'
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
        if (comparison.score >= 70) {
          addXP(5)
        } else {
          recordError({
            context: prev.target,
            userAnswer: text,
            correctAnswer: prev.target,
            source: 'pronunciacio',
            category: 'pronunciacio',
          })
        }
        return { ...prev, transcript: text, comparison }
      })
    },
    [activeKey]
  )

  const sr = useSpeechRecognition({ lang: 'ca-ES', onResult: handleResult })
  const unitSections = allSections.filter((s) => s.unitId === units[selectedUnit]?.id)

  const speak = useCallback(
    (text: string, key: string) => {
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
    },
    []
  )

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
    [sr]
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

  return (
    <div className="min-h-screen bg-white px-5 md:px-10 lg:px-20 xl:px-32 pt-8 pb-44 md:pb-12">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#1a1a1a] mb-2">Pronunciació</h1>
        <p className="text-[16px] text-[#555] mb-10">Escolta, repeteix i millora la teva pronunciació</p>

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
          <div className="bg-[#FFF8E1] rounded-2xl px-6 py-4 mb-8">
            <p className="text-[14px] text-[#8B6F00] leading-relaxed">
              El teu navegador no suporta el reconeixement de veu. Podràs escoltar les paraules, però no gravar-te. Prova amb Chrome o Edge.
            </p>
          </div>
        )}

        <div className="bg-[#F0FFF4] rounded-2xl px-6 py-4 mb-10">
          <p className="text-[15px] text-[#065F46] leading-relaxed">
            Prem el botó de so per escoltar i el de micròfon per gravar-te. Comparem paraula per paraula.
          </p>
        </div>

        <div className="space-y-3">
          {unitSections.map((section) => {
            const sectionKey = `${section.unitId}-${section.title}`
            const isExpanded = expandedSection === sectionKey
            return (
              <div key={sectionKey} className={`rounded-2xl overflow-hidden transition-colors ${isExpanded ? 'bg-[#F0FFF4]' : 'bg-white'}`}>
                <button
                  onClick={() => {
                    setExpandedSection(isExpanded ? null : sectionKey)
                    setAttempt(null)
                    setActiveKey(null)
                  }}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-[#10B981] text-white rounded-full px-4 py-1.5 text-[14px] font-bold">{section.title}</span>
                    <span className="text-[14px] text-[#666]">{section.words.length} paraules</span>
                  </div>
                  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-6">
                    <div className="space-y-2">
                      {section.words.map((word, wi) => {
                        const itemKey = `${sectionKey}-${wi}`
                        const target = word.example || word.catalan
                        const isRecordingHere = sr.isRecording && activeKey === itemKey
                        const isSpeakingHere = speakingKey === itemKey
                        return (
                          <div key={wi} className="bg-white rounded-xl flex items-center gap-3 px-5 py-4 hover:bg-[#F0FFF4] transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-[16px] font-bold text-[#1a1a1a]">{word.catalan}</p>
                              <p className="text-[16px] text-[#666]">{word.spanish}</p>
                              {word.pronunciation && (
                                <p className="text-[13px] text-[#555] font-mono mt-0.5">{word.pronunciation}</p>
                              )}
                            </div>

                            {hasTTS && (
                              <button
                                onClick={() => speak(target, itemKey)}
                                disabled={isSpeakingHere}
                                aria-label={`Escolta ${word.catalan}`}
                                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isSpeakingHere ? 'bg-[#059669] text-white' : 'bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5]'}`}
                              >
                                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                </svg>
                              </button>
                            )}

                            {sr.supported && (
                              <button
                                onClick={() => startAttempt(itemKey, target)}
                                aria-label={isRecordingHere ? `Aturar gravació de ${word.catalan}` : `Grava ${word.catalan}`}
                                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isRecordingHere ? 'bg-[#DC2626] text-white animate-pulse' : 'bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FECACA]'}`}
                              >
                                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="2" width="6" height="11" rx="3" />
                                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                                  <line x1="12" y1="18" x2="12" y2="22" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {attempt &&
                      attempt.targetKey.startsWith(sectionKey) &&
                      attempt.transcript && (
                        <div className="mt-5 bg-white rounded-2xl px-5 py-5 border border-[#E5E7EB]">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-[16px] font-extrabold" style={{ color: scoreColor(attempt.comparison.score) }}>
                              {scoreLabel(attempt.comparison.score)}
                            </p>
                            <span className="text-[16px] font-extrabold" style={{ color: scoreColor(attempt.comparison.score) }}>
                              {attempt.comparison.score}%
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {attempt.comparison.words.map((w, i) => (
                              <span
                                key={i}
                                className={`px-2.5 py-1 rounded-full text-[13px] font-bold ${w.ok ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-[#FEF2F2] text-[#991B1B]'}`}
                              >
                                {w.word}
                              </span>
                            ))}
                          </div>

                          <p className="text-[13px] text-[#666] mb-4">
                            <span className="font-semibold">Has dit:</span> &ldquo;{attempt.transcript}&rdquo;
                          </p>

                          {attempt.comparison.score < 90 && !attempt.analysis && (
                            <button
                              onClick={requestPhoneticAnalysis}
                              disabled={!!attempt.analysisLoading}
                              className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white text-[13px] font-bold px-5 py-2.5 rounded-full hover:bg-[#333] transition-colors disabled:opacity-50"
                            >
                              {attempt.analysisLoading ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                  Analitzant...
                                </>
                              ) : (
                                <>Per què he fallat?</>
                              )}
                            </button>
                          )}

                          {attempt.analysis && (
                            <div className="mt-4 bg-[#FFF8E1] rounded-2xl p-4">
                              {attempt.analysis.phonemeErrors.length > 0 ? (
                                <div className="space-y-3">
                                  {attempt.analysis.phonemeErrors.map((err, i) => (
                                    <div key={i}>
                                      <p className="text-[13px] font-extrabold text-[#8B6F00] mb-1">
                                        &ldquo;{err.word}&rdquo; · fonema {err.phoneme}
                                      </p>
                                      <p className="text-[14px] text-[#1a1a1a] mb-1">{err.explanation}</p>
                                      <p className="text-[13px] text-[#8B6F00] font-semibold">💡 {err.tip}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[14px] text-[#1a1a1a]">Sense errors de fonema detectats.</p>
                              )}
                              {attempt.analysis.tip && (
                                <p className="text-[13px] text-[#8B6F00] mt-3 pt-3 border-t border-[#F0E8C0]">
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
            <p className="text-[16px] text-[#555]">No hi ha contingut per aquesta unitat.</p>
          </div>
        )}
      </div>
    </div>
  )
}
