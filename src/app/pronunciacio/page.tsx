'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { units } from '@/data/units'
import { addXP } from '@/lib/progress'
import UnitSelector from '@/components/UnitSelector'

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

const allSections: PronunciationCategory[] = units.flatMap((u) =>
  Object.entries(u.vocabulary).map(([category, items]) => ({
    title: category,
    unitId: u.id,
    words: items.map((item) => ({ catalan: item.catalan, spanish: item.spanish, pronunciation: item.pronunciation, example: item.example })),
  }))
)

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1]
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
    }
  }
  return matrix[b.length][a.length]
}

function getMatchPercentage(recognized: string, expected: string): number {
  const r = recognized.toLowerCase().trim()
  const e = expected.toLowerCase().trim()
  if (r === e) return 100
  if (r.includes(e) || e.includes(r)) return 90
  const dist = levenshteinDistance(r, e)
  const maxLen = Math.max(r.length, e.length)
  if (maxLen === 0) return 0
  return Math.max(0, Math.round((1 - dist / maxLen) * 100))
}

function getBarColor(pct: number): string {
  if (pct >= 70) return '#059669'
  if (pct >= 40) return '#FFA726'
  return '#C62828'
}

export default function PronunciacioPage() {
  const [selectedUnit, setSelectedUnit] = useState(0)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [listeningWord, setListeningWord] = useState<string | null>(null)
  const [recordingWord, setRecordingWord] = useState<string | null>(null)
  const [hasSR, setHasSR] = useState(false)
  const [hasTTS, setHasTTS] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<{
    expected: string
    recognized: string
    match: boolean
    percentage: number
  } | null>(null)

  // Detect browser capabilities
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    setHasSR(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
    setHasTTS(typeof speechSynthesis !== 'undefined')
  }, [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const unitSections = allSections.filter((s) => s.unitId === units[selectedUnit]?.id)

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setListeningWord(text)
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ca-ES'
    utterance.rate = 0.85
    const voices = window.speechSynthesis.getVoices()
    const catalanVoice = voices.find((v) => v.lang === 'ca-ES' || v.lang.startsWith('ca'))
    if (catalanVoice) utterance.voice = catalanVoice
    utterance.onend = () => setListeningWord(null)
    utterance.onerror = () => setListeningWord(null)
    window.speechSynthesis.speak(utterance)
  }, [])

  const startRecording = useCallback((expectedWord: string) => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRecognitionApi = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognitionApi) {
      alert('El teu navegador no suporta el reconeixement de veu. Prova amb Chrome.')
      return
    }
    if (recognitionRef.current) recognitionRef.current.abort()

    const recognition = new SpeechRecognitionApi()
    recognition.lang = 'ca-ES'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition
    setRecordingWord(expectedWord)
    setComparisonResult(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript.toLowerCase().trim()
      const expected = expectedWord.toLowerCase().trim()
      const percentage = getMatchPercentage(result, expected)
      const match = percentage >= 70
      if (match) {
        addXP(5)
      }
      setComparisonResult({ expected: expectedWord, recognized: result, match, percentage })
      setRecordingWord(null)
    }
    recognition.onerror = () => {
      setRecordingWord(null)
      setComparisonResult({
        expected: expectedWord,
        recognized: "(no s'ha detectat veu)",
        match: false,
        percentage: 0,
      })
    }
    recognition.onend = () => setRecordingWord(null)
    recognition.start()
  }, [])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop()
    setRecordingWord(null)
  }, [])

  return (
    <div className="min-h-screen bg-white px-5 md:px-10 lg:px-20 xl:px-32 pt-8 pb-44 md:pb-12">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#1a1a1a] mb-2">Pronunciació</h1>
        <p className="text-[16px] text-[#555] mb-10">
          Escolta, repeteix i millora la teva pronunciació
        </p>

        {/* Unit selector */}
        <UnitSelector selectedUnit={selectedUnit} onSelect={(i) => { setSelectedUnit(i); setExpandedSection(null); setComparisonResult(null) }} />

        {/* Info box */}
        <div className="bg-[#F0FFF4] border border-[#A7F3D0] rounded-2xl px-6 py-4 mb-10">
          <p className="text-[16px] text-[#065F46] leading-relaxed">
            Prem el botó de so per escoltar la paraula i el de micròfon per enregistrar-te. Compara
            la teva pronunciació.
          </p>
        </div>

        {/* Sections accordion */}
        <div className="space-y-3">
          {unitSections.map((section) => {
            const sectionKey = `${section.unitId}-${section.title}`
            const isExpanded = expandedSection === sectionKey
            return (
              <div key={sectionKey} className={`rounded-2xl overflow-hidden transition-colors ${isExpanded ? 'bg-[#F0FFF4]' : 'bg-white'}`}>
                <button
                  onClick={() => {
                    setExpandedSection(isExpanded ? null : sectionKey)
                    setComparisonResult(null)
                  }}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-[#10B981] text-white rounded-full px-4 py-1.5 text-[14px] font-bold">{section.title}</span>
                    <span className="text-[14px] text-[#666]">{section.words.length} paraules</span>
                  </div>
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-6">
                    <div className="space-y-2">
                      {section.words.map((word, wi) => (
                        <div
                          key={wi}
                          className="bg-white rounded-xl flex items-center gap-3 px-5 py-4 hover:bg-[#F0FFF4] transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[16px] font-bold text-[#1a1a1a]">{word.catalan}</p>
                            <p className="text-[16px] text-[#666]">{word.spanish}</p>
                            {word.pronunciation && (
                              <p className="text-[13px] text-[#555] font-mono mt-0.5">
                                {word.pronunciation}
                              </p>
                            )}
                          </div>

                          {/* Listen button */}
                          {hasTTS && <button
                            onClick={() => speak(word.example || word.catalan)}
                            disabled={listeningWord === word.catalan}
                            aria-label={`Escolta la paraula ${word.catalan}`}
                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                              listeningWord === word.catalan
                                ? 'bg-[#059669] text-white'
                                : 'bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5]'
                            }`}
                          >
                            <svg
                              aria-hidden="true"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={listeningWord === word.catalan ? 'white' : '#059669'}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </svg>
                          </button>}

                          {/* Record button */}
                          {hasSR && <button
                            onClick={() =>
                              recordingWord === word.catalan
                                ? stopRecording()
                                : startRecording(word.example || word.catalan)
                            }
                            aria-label={recordingWord === word.catalan ? `Aturar gravació de ${word.catalan}` : `Grava la teva pronunciació de ${word.catalan}`}
                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                              recordingWord === word.catalan
                                ? 'bg-[#DC2626] text-white animate-pulse'
                                : 'bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FECACA]'
                            }`}
                          >
                            <svg
                              aria-hidden="true"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={recordingWord === word.catalan ? 'white' : '#DC2626'}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="9" y="2" width="6" height="11" rx="3" />
                              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                              <line x1="12" y1="18" x2="12" y2="22" />
                            </svg>
                          </button>}
                        </div>
                      ))}
                    </div>

                    {/* Comparison result with similarity bar */}
                    {comparisonResult && expandedSection === sectionKey && (
                      <div role="alert" className="mt-4 rounded-2xl px-5 py-4 bg-white border border-[#A7F3D0]">
                        <div className="flex items-center justify-between mb-3">
                          <p
                            className="text-[16px] font-extrabold"
                            style={{ color: getBarColor(comparisonResult.percentage) }}
                          >
                            {comparisonResult.percentage >= 70
                              ? 'Molt bé!'
                              : comparisonResult.percentage >= 40
                                ? 'Quasi!'
                                : 'Torna a provar!'}
                          </p>
                          <span
                            className="text-[16px] font-extrabold"
                            style={{ color: getBarColor(comparisonResult.percentage) }}
                          >
                            {comparisonResult.percentage}%
                          </span>
                        </div>

                        {/* Similarity bar */}
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3" role="progressbar" aria-valuenow={comparisonResult.percentage} aria-valuemin={0} aria-valuemax={100} aria-label="Similitud de pronunciació">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${comparisonResult.percentage}%`,
                              background: comparisonResult.percentage >= 70 ? 'linear-gradient(to right, #10B981, #059669)' : undefined,
                              backgroundColor: comparisonResult.percentage < 70 ? getBarColor(comparisonResult.percentage) : undefined,
                            }}
                          />
                        </div>

                        <p className="text-[16px] text-[#666]">
                          Esperat:{' '}
                          <span className="font-bold text-[#1a1a1a]">
                            {comparisonResult.expected}
                          </span>
                        </p>
                        <p className="text-[16px] text-[#666]">
                          Detectat:{' '}
                          <span
                            className="font-bold"
                            style={{ color: getBarColor(comparisonResult.percentage) }}
                          >
                            {comparisonResult.recognized}
                          </span>
                        </p>
                        {comparisonResult.percentage >= 70 && (
                          <p className="text-[16px] text-[#059669] font-semibold mt-2">+5 XP</p>
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
