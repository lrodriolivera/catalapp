'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { dialogues, Dialogue } from '@/data/dialogues'
import { speakNatural } from '@/lib/api'

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
    // Auto-scroll to current line
    if (currentLine >= 0 && linesRef.current) {
      const el = linesRef.current.children[currentLine] as HTMLElement
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentLine])

  const speakLine = useCallback((text: string, speaker?: 'A' | 'B'): Promise<void> => {
    if (!selected) return Promise.resolve()
    // Detect gender from speaker emoji: 👨 = male, 👩 = female
    const speakerData = speaker === 'A' ? selected.speakerA : selected.speakerB
    const gender = speakerData?.emoji === '👨' || speakerData?.emoji === '👨‍💼' || speakerData?.emoji === '🧑' ? 'male' : 'female'
    return speakNatural(text, speed === 'slow' ? 0.8 : 1.0, undefined, gender)
  }, [speed])

  const playAll = useCallback(async () => {
    if (!selected) return
    playingRef.current = true
    setPlaying(true)
    for (let i = 0; i < selected.lines.length; i++) {
      if (!playingRef.current) break
      setCurrentLine(i)
      await speakLine(selected.lines[i].catalan, selected.lines[i].speaker)
      // Pause between lines
      if (playingRef.current) await new Promise(r => setTimeout(r, speed === 'slow' ? 800 : 500))
    }
    playingRef.current = false
    setPlaying(false)
    setCurrentLine(-1)
  }, [selected, speakLine, speed])

  const stopPlaying = useCallback(() => {
    setPlaying(false)
    playingRef.current = false
    setCurrentLine(-1)
  }, [])

  const playSingleLine = useCallback((idx: number) => {
    if (!selected) return
    setCurrentLine(idx)
    speakLine(selected.lines[idx].catalan, selected.lines[idx].speaker).then(() => setCurrentLine(-1))
  }, [selected, speakLine])

  const goBack = useCallback(() => {
    stopPlaying()
    setSelected(null)
  }, [stopPlaying])

  const unitGroups = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(uid => ({
    unitId: uid,
    title: ['', 'Hola, com et dius?', 'Coneixes la meva família?', 'On vius?', 'Què fas cada dia?', "T'agrada el cinema?", 'Anem a comprar', 'Què vol prendre?', 'Ens movem per la ciutat', 'Què necessito?', 'Qui és qui?', 'El pis a punt', 'Avui és festa!', 'Ens formem', 'Anem a comprar (ampliació)', 'Com et trobes?', 'Sortim!', 'Tinc una entrevista!', 'Tinc temps lliure'][uid] || '',
    items: dialogues.filter(d => d.unitId === uid),
  }))

  const W = 'px-5 md:px-10 lg:px-20 xl:px-32 pt-8 pb-44 md:pb-12'
  const C = 'max-w-[800px] mx-auto'

  // === DIALOGUE SELECTION ===
  if (!selected) {
    return (
      <div className={W}><div className={C}>
        <p className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-2">Escolta i aprèn</p>
        <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#1a1a1a] mb-2">Diàlegs</h1>
        <p className="text-[16px] text-[#666] mb-10">Converses reals per escoltar i practicar la pronunciació</p>

        <div className="space-y-10">
          {unitGroups.map(group => (
            <div key={group.unitId}>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white rounded-full w-9 h-9 flex items-center justify-center text-[15px] font-extrabold">{group.unitId}</span>
                <div>
                  <h2 className="text-[16px] font-extrabold text-[#1a1a1a]">Unitat {group.unitId}</h2>
                  <p className="text-[14px] text-[#666]">{group.title}</p>
                </div>
              </div>

              <div className="space-y-3">
                {group.items.map(d => (
                  <button key={d.id} onClick={() => setSelected(d)}
                    className="w-full text-left bg-[#F0F4FF] rounded-2xl p-5 hover:bg-[#E8EDFF] active:bg-[#DDE3FF] transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{d.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-bold text-[#1a1a1a]">{d.title}</p>
                        <p className="text-[14px] text-[#666]">{d.description}</p>
                        <p className="text-[13px] text-[#999] mt-1">{d.speakerA.emoji} {d.speakerA.name} · {d.speakerB.emoji} {d.speakerB.name} · {d.lines.length} línies</p>
                      </div>
                      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="#4F46E5" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div></div>
    )
  }

  // === DIALOGUE PLAYER ===
  const dialogueProgress = currentLine >= 0 ? ((currentLine + 1) / selected.lines.length) * 100 : 0

  return (
    <div className={W}><div className={C}>
      <button onClick={goBack} className="text-[#555] text-[15px] font-bold mb-6 flex items-center gap-1 hover:text-[#1a1a1a]">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Tornar
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">{selected.emoji}</span>
        <h1 className="text-[24px] md:text-[30px] font-extrabold text-[#1a1a1a] mb-1">{selected.title}</h1>
        <p className="text-[15px] text-[#666]">{selected.description}</p>
        <p className="text-[14px] text-[#999] mt-2">{selected.speakerA.emoji} {selected.speakerA.name} &nbsp;·&nbsp; {selected.speakerB.emoji} {selected.speakerB.name}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {/* Play/Stop */}
        <button onClick={playing ? stopPlaying : playAll}
          aria-label={playing ? 'Aturar diàleg' : 'Reproduir diàleg'}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            playing ? 'bg-[#EF4444] hover:bg-[#DC2626]' : 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:opacity-90'
          }`}>
          {playing ? (
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          )}
        </button>
      </div>

      {/* Options */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <button onClick={() => setSpeed(speed === 'normal' ? 'slow' : 'normal')}
          aria-pressed={speed === 'slow'}
          className={`px-4 py-2 rounded-full text-[14px] font-bold transition-colors ${
            speed === 'slow' ? 'bg-[#FFF8E1] text-[#F59E0B]' : 'bg-[#F5F5F5] text-[#666]'
          }`}>
          🐢 {speed === 'slow' ? 'Lent' : 'Normal'}
        </button>
        <button onClick={() => setShowTranslation(!showTranslation)}
          aria-pressed={showTranslation}
          className={`px-4 py-2 rounded-full text-[14px] font-bold transition-colors ${
            showTranslation ? 'bg-[#F0F4FF] text-[#4F46E5]' : 'bg-[#F5F5F5] text-[#666]'
          }`}>
          {showTranslation ? '🔤 Amb traducció' : '🔤 Sense traducció'}
        </button>
      </div>

      {/* Progress */}
      {playing && (
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 bg-[#F0F0F0] rounded-full h-2" role="progressbar" aria-valuenow={Math.round(dialogueProgress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progrés del diàleg">
            <div className="h-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] transition-all duration-500"
              style={{ width: `${dialogueProgress}%` }}/>
          </div>
          <span className="text-[13px] font-bold text-[#999]">{currentLine + 1}/{selected.lines.length}</span>
        </div>
      )}

      {/* Dialogue lines */}
      <div ref={linesRef} className="space-y-3">
        {selected.lines.map((line, i) => {
          const isActive = i === currentLine
          const speaker = line.speaker === 'A' ? selected.speakerA : selected.speakerB
          const isLeft = line.speaker === 'A'

          return (
            <button key={i} onClick={() => playSingleLine(i)}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`${speaker.name}: ${line.catalan}`}
              className={`w-full text-left transition-all rounded-2xl p-4 ${
                isActive
                  ? isLeft ? 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] scale-[1.02]' : 'bg-[#1a1a1a] scale-[1.02]'
                  : 'bg-[#F8F8F8] hover:bg-[#F0F0F0]'
              }`}>
              <div className={`flex gap-3 ${isLeft ? '' : 'flex-row-reverse text-right'}`}>
                <span className="text-2xl flex-shrink-0">{speaker.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-bold mb-1 ${isActive ? 'text-white/70' : 'text-[#999]'}`}>
                    {speaker.name}
                  </p>
                  <p className={`text-[17px] font-bold leading-relaxed ${isActive ? 'text-white' : 'text-[#1a1a1a]'}`}>
                    {line.catalan}
                  </p>
                  {showTranslation && (
                    <p className={`text-[14px] mt-1 ${isActive ? 'text-white/60' : 'text-[#999]'}`}>
                      {line.spanish}
                    </p>
                  )}
                </div>
                <span className={`flex-shrink-0 self-center ${isActive ? 'text-white' : 'text-[#ccc]'}`}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Replay button at bottom */}
      <div className="mt-8">
        <button onClick={playing ? stopPlaying : playAll}
          aria-label={playing ? 'Aturar diàleg' : 'Reproduir tot el diàleg'}
          className="w-full bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#333] transition-colors flex items-center justify-center gap-2">
          {playing ? (
            <><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Aturar</>
          ) : (
            <><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg> Reproduir tot el diàleg</>
          )}
        </button>
      </div>
    </div></div>
  )
}
