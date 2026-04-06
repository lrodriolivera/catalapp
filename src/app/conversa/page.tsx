'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { sendConversaMessage } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  correction?: string
  correctedPhrase?: string
  error?: boolean
}

interface Scenario {
  key: string; emoji: string; title: string; description: string; starter: string; suggestions: string[][]
}

interface ScenarioGroup {
  unitId: number
  unitTitle: string
  scenarios: Scenario[]
}

const scenarioGroups: ScenarioGroup[] = [
  {
    unitId: 1, unitTitle: 'Hola, com et dius?',
    scenarios: [
      { key: 'presentacions', emoji: '👋', title: 'Presentar-se', description: 'Dir el nom, edat i procedència', starter: "Hola! Jo soc la Clara. Com et dius? D'on ets?",
        suggestions: [['Hola, em dic...', 'Soc de...', 'Tinc ... anys'], ['Em dic Joan', 'Soc de Colòmbia', 'Visc a Barcelona'], ['Faig de programador', 'Tinc trenta anys', 'Encantada!']] },
      { key: 'telefon', emoji: '📞', title: 'Parlar per telèfon', description: 'Trucar i donar informació', starter: 'Ring ring! Hola, digui? Qui truca?',
        suggestions: [['Hola, soc en Joan', 'Puc parlar amb...?', 'Truco per...'], ['Quin número tens?', 'Et truco després', 'Un moment, si us plau'], ['Gràcies, adéu!', 'Fins demà!', "D'acord, perfecte"]] },
      { key: 'oficina', emoji: '🏢', title: 'A la feina', description: 'Presentar-se en un lloc de treball', starter: "Bon dia! Ets el nou treballador? Benvingut! Com et dius i de què fas?",
        suggestions: [['Soc enginyer', 'Treballo aquí des de...', 'Encantat!'], ['Faig de programador', 'La meva oficina és...', 'On és el bany?'], ['Moltes gràcies', 'A quina hora dinem?', 'Fins demà!']] },
    ],
  },
  {
    unitId: 2, unitTitle: 'Coneixes la meva família?',
    scenarios: [
      { key: 'familia', emoji: '👨‍👩‍👧', title: 'La meva família', description: 'Parlar dels membres de la família', starter: 'Hola! Avui parlarem de la família. Tens germans o germanes?',
        suggestions: [['Tinc un germà', 'La meva mare és...', 'No tinc germans'], ['El meu pare es diu...', 'Viuen a...', 'Tinc dos fills'], ['La meva família és gran', 'Són molt simpàtics', 'Tenen ... anys']] },
      { key: 'descriure', emoji: '🧑', title: 'Descriure persones', description: 'Característiques físiques i de caràcter', starter: "Avui practiquem les descripcions. Com ets tu? Descriu-te!",
        suggestions: [['Soc alt i prim', 'Tinc els ulls marrons', 'Soc simpàtic'], ['Tinc els cabells negres', 'Soc treballador', 'La meva amiga és rossa'], ['Ell és molt divertit', 'Ella és intel·ligent', 'Són molt macos']] },
      { key: 'felicitar', emoji: '🎂', title: 'Felicitar i convidar', description: 'Aniversaris, festes i invitacions', starter: "Hola! Saps que? Demà és el meu aniversari! Faig una festa!",
        suggestions: [['Per molts anys!', 'Quants anys fas?', 'On és la festa?'], ['A quina hora?', 'Porto alguna cosa?', 'Hi ve tothom?'], ['Enhorabona!', 'Serà genial!', 'Ens veiem allà!']] },
    ],
  },
  {
    unitId: 3, unitTitle: 'On vius?',
    scenarios: [
      { key: 'habitatge', emoji: '🏠', title: 'El meu pis', description: 'Descriure on vius i les habitacions', starter: 'Bon dia! On vius? Jo visc en un pis a Barcelona, al centre.',
        suggestions: [['Visc a Barcelona', 'Tinc un pis', 'Al segon pis'], ['Hi ha tres habitacions', 'La cuina és gran', 'Té terrassa'], ['El meu barri és tranquil', 'Hi ha botigues a prop', "M'agrada molt"]] },
      { key: 'barri', emoji: '🏘️', title: 'El meu barri', description: 'Serveis, botigues i llocs del barri', starter: "Hola! Parlem del teu barri. Què hi ha a prop de casa teva?",
        suggestions: [['Hi ha un supermercat', 'A prop hi ha un parc', 'El metro és al costat'], ['Hi ha una farmàcia', 'No hi ha hospital', 'Hi ha moltes botigues'], ["M'agrada el barri", 'És tranquil', 'Hi ha de tot']] },
      { key: 'buscar_pis', emoji: '🔑', title: 'Buscar pis', description: 'Preguntar per un pis de lloguer', starter: "Bon dia! Truco per l'anunci del pis. Encara està disponible?",
        suggestions: [['Quantes habitacions té?', 'Hi ha ascensor?', 'Quin pis és?'], ['Quant val el lloguer?', 'Hi ha terrassa?', 'Les despeses estan incloses?'], ['Puc anar a veure-el?', 'A quina hora?', 'Moltes gràcies!']] },
    ],
  },
  {
    unitId: 4, unitTitle: 'Què fas cada dia?',
    scenarios: [
      { key: 'rutina', emoji: '⏰', title: 'La rutina diària', description: 'Explicar què fas cada dia', starter: 'Bon dia! Què fas normalment cada dia? A quina hora et lleves?',
        suggestions: [['Em llevo a les set', 'Esmorzo a les vuit', 'Treballo de nou a cinc'], ['Dino a les dues', 'Estudio al vespre', 'Sopo a les nou'], ['Els dissabtes descanso', 'Vaig al gimnàs', 'Passejo pel parc']] },
      { key: 'hores', emoji: '🕐', title: 'Les hores', description: 'Practicar a dir i preguntar les hores', starter: "Hola! Practiquem les hores en català. Quina hora és ara?",
        suggestions: [['Són les nou en punt', 'És un quart de deu', 'Són dos quarts de deu'], ['A quina hora comences?', 'A les vuit del matí', 'Són tres quarts de cinc'], ['Quina hora és?', 'Falten cinc minuts', 'Són les dues en punt']] },
      { key: 'cap_setmana', emoji: '🌤️', title: 'El cap de setmana', description: 'Parlar del que fas els caps de setmana', starter: "Hola! Què fas normalment els caps de setmana? T'agrada sortir?",
        suggestions: [['Dissabte em llevo tard', 'Vaig al mercat', 'Surto amb amics'], ['Diumenge descanso', 'Cuino a casa', 'Passejo per la platja'], ['Sempre vaig al cinema', 'De vegades llegeixo', 'Mai treballo el diumenge']] },
    ],
  },
]

// Flat list for lookup
const allScenarios = scenarioGroups.flatMap(g => g.scenarios)

export default function ConversaPage() {
  const [selected, setSelected] = useState<Scenario | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioMode, setAudioMode] = useState(false)
  const [hasSR, setHasSR] = useState(false)
  const [hasTTS, setHasTTS] = useState(false)
  const [suggestionSet, setSuggestionSet] = useState(0)
  const [showEvaluation, setShowEvaluation] = useState(false)
  const [evaluation, setEvaluation] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const pendingTranscriptRef = useRef<string>('')
  const audioModeRef = useRef(audioMode)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendDirectRef = useRef<(text: string) => void>(() => {})
  useEffect(() => { audioModeRef.current = audioMode }, [audioMode])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    setHasSR(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
    setHasTTS(typeof speechSynthesis !== 'undefined')
    if (typeof speechSynthesis !== 'undefined') { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices() }
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])

  const getBestVoice = useCallback(() => {
    const v = speechSynthesis.getVoices()
    return v.find(x => x.lang.startsWith('ca') && x.name.includes('Google')) || v.find(x => x.lang.startsWith('ca')) || v.find(x => x.lang === 'es-ES' && x.name.includes('Google')) || null
  }, [])

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!text || !hasTTS) { onEnd?.(); return }
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ca-ES'; u.rate = 0.82; u.pitch = 1.0
    const v = getBestVoice(); if (v) u.voice = v
    setIsSpeaking(true)
    u.onend = () => { setIsSpeaking(false); onEnd?.() }
    u.onerror = () => { setIsSpeaking(false); onEnd?.() }
    speechSynthesis.speak(u)
  }, [getBestVoice, hasTTS])

  // PUSH-TO-TALK: record while holding, send on release
  const startListening = useCallback(() => {
    if (!hasSR) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return
    if (recognitionRef.current) { try { recognitionRef.current.abort() } catch {} }
    const r = new SR()
    r.lang = 'ca-ES'
    r.interimResults = false
    r.maxAlternatives = 1
    r.continuous = false
    recognitionRef.current = r
    pendingTranscriptRef.current = ''
    setIsRecording(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      const text = e.results[0][0].transcript
      pendingTranscriptRef.current = text
    }
    r.onerror = () => { setIsRecording(false) }
    r.onend = () => {
      setIsRecording(false)
      const text = pendingTranscriptRef.current
      if (text) {
        if (audioModeRef.current) {
          sendDirectRef.current(text)
        } else {
          setInput(text)
        }
      }
    }
    r.start()
  }, [hasSR]) // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} }
  }, [])

  // Speak the corrected phrase when there's a correction
  const speakCorrection = useCallback((phrase: string) => {
    if (!hasTTS) return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(phrase)
    u.lang = 'ca-ES'; u.rate = 0.7; u.pitch = 1.0 // Slower for learning
    const v = getBestVoice(); if (v) u.voice = v
    setIsSpeaking(true)
    u.onend = () => setIsSpeaking(false)
    u.onerror = () => setIsSpeaking(false)
    speechSynthesis.speak(u)
  }, [getBestVoice, hasTTS])

  const sendDirect = useCallback(async (text: string) => {
    if (!text.trim() || !selected) return
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text.trim() }])
    setInput(''); setIsTyping(true); setSuggestionSet(prev => (prev + 1) % 3)
    const history = [...messages.map(m => ({ role: m.role === 'system' ? 'assistant' : m.role, content: m.content })), { role: 'user' as const, content: text.trim() }]
    try {
      const data = await sendConversaMessage(history, selected.key)
      const aMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', content: data.response, correction: data.correction || undefined, correctedPhrase: data.correction || undefined }
      setMessages(prev => [...prev, aMsg])
      if (audioMode) {
        // Speak response, then if there's a correction, speak it slowly, then listen again
        speak(data.response, () => {
          if (data.correction) {
            setTimeout(() => speakCorrection(data.correction!), 400)
          }
          // Auto-listen after a pause (whether or not there was a correction)
          // Don't auto-listen, let user press button (push-to-talk)
        })
      }
    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: 'Error de connexió.', error: true }])
    } finally { setIsTyping(false) }
  }, [selected, messages, audioMode, speak, speakCorrection])

  useEffect(() => { sendDirectRef.current = sendDirect }, [sendDirect])
  const sendMessage = useCallback(() => sendDirect(input), [input, sendDirect])

  const startConversation = useCallback((s: Scenario) => {
    setSelected(s); setSuggestionSet(0); setShowEvaluation(false); setEvaluation('')
    setMessages([{ id: 'starter', role: 'assistant', content: s.starter }])
    if (audioMode) setTimeout(() => speak(s.starter), 300)
  }, [audioMode, speak])

  // Evaluate conversation quality
  const evaluateConversation = useCallback(async () => {
    if (!selected || messages.length < 3) return
    setIsEvaluating(true)
    const history = messages.map(m => ({ role: m.role === 'system' ? 'assistant' : m.role, content: m.content }))
    // Send special evaluation request
    try {
      const data = await sendConversaMessage([...history, { role: 'user', content: 'AVALUACIÓ: Avalua la meva participació en aquesta conversa. Dona una nota del 1 al 10, destaca els errors que he comès, i per cada error dona la frase correcta en català. Format: primer la nota, després els errors amb correccions, i finalment un consell.' }], selected.key)
      setEvaluation(data.response)
      setShowEvaluation(true)
      if (audioMode && hasTTS) speak(data.response)
    } catch {
      setEvaluation('No he pogut avaluar la conversa. Torna a provar.')
      setShowEvaluation(true)
    } finally { setIsEvaluating(false) }
  }, [selected, messages, audioMode, hasTTS, speak])

  const goBack = useCallback(() => {
    speechSynthesis.cancel(); if (recognitionRef.current) try { recognitionRef.current.stop() } catch {}
    setSelected(null); setMessages([]); setInput(''); setIsTyping(false); setIsRecording(false); setIsSpeaking(false); setShowEvaluation(false); setEvaluation('')
  }, [])

  const currentSuggestions = selected ? (selected.suggestions[suggestionSet] || selected.suggestions[0]) : []

  // ===== SCENARIO SELECTION =====
  if (!selected) {
    return (
      <div className="min-h-screen bg-white px-5 md:px-10 lg:px-20 xl:px-32 pt-8 pb-44 md:pb-12">
        <div className="max-w-[700px] mx-auto">
          <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#1a1a1a] mb-2">Conversa</h1>
          <p className="text-[17px] text-[#555] mb-8">Practica parlant català amb intel·ligència artificial</p>

          {hasSR ? (
            <div className="flex items-center justify-between bg-[#F8F8F8] rounded-2xl p-5 mb-8">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎙️</span>
                <div>
                  <p className="text-[16px] font-bold text-[#1a1a1a]">Mode conversa per veu</p>
                  <p className="text-[14px] text-[#666]">Mantén premut el botó mentre parles</p>
                </div>
              </div>
              <button onClick={() => setAudioMode(prev => !prev)}
                className={`relative w-14 h-8 rounded-full transition-colors ${audioMode ? 'bg-[#1a1a1a]' : 'bg-[#ddd]'}`}>
                <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${audioMode ? 'translate-x-7' : 'translate-x-1'}`}/>
              </button>
            </div>
          ) : (
            <div className="bg-[#FFF8E1] rounded-2xl p-5 mb-8">
              <p className="text-[15px] text-[#6D4C00]">💡 Usa <strong>Chrome</strong> o <strong>Edge</strong> per a la millor experiència amb veu.</p>
            </div>
          )}

          <div className="space-y-8">
            {scenarioGroups.map(group => (
              <div key={group.unitId}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white rounded-full w-8 h-8 flex items-center justify-center text-[14px] font-extrabold">{group.unitId}</span>
                  <p className="text-[15px] font-bold text-[#1a1a1a]">{group.unitTitle}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {group.scenarios.map(s => (
                    <button key={s.key} onClick={() => startConversation(s)}
                      className="text-left bg-[#F8F8F8] rounded-2xl p-5 hover:bg-[#F0F0F0] active:bg-[#E8E8E8] transition-colors">
                      <span className="text-3xl block mb-2">{s.emoji}</span>
                      <p className="text-[16px] font-bold text-[#1a1a1a] mb-1">{s.title}</p>
                      <p className="text-[14px] text-[#666]">{s.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ===== EVALUATION OVERLAY =====
  if (showEvaluation) {
    return (
      <div className="min-h-screen bg-white px-5 md:px-10 lg:px-20 xl:px-32 pt-8 pb-44 md:pb-12">
        <div className="max-w-[700px] mx-auto">
          <button onClick={() => setShowEvaluation(false)} className="text-[15px] font-bold text-[#555] hover:text-[#1a1a1a] mb-6">← Tornar al xat</button>
          <h1 className="text-[28px] md:text-[34px] font-extrabold text-[#1a1a1a] mb-2">Avaluació</h1>
          <p className="text-[13px] font-bold text-[#666] uppercase tracking-[0.2em] mb-6">La IA ha avaluat la teva conversa</p>

          <div className="bg-[#F8F8F8] rounded-2xl p-6 mb-6">
            <p className="text-[17px] text-[#1a1a1a] leading-relaxed whitespace-pre-line">{evaluation}</p>
          </div>

          {hasTTS && (
            <button onClick={() => speak(evaluation)} className="w-full bg-[#F5F5F5] text-[#1a1a1a] font-bold py-4 rounded-full text-[16px] hover:bg-[#eee] transition-colors mb-3 flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              Escolta l&apos;avaluació
            </button>
          )}

          <button onClick={goBack} className="w-full bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#333] transition-colors mb-3">
            Nova conversa
          </button>
          <button onClick={() => setShowEvaluation(false)} className="w-full bg-[#F5F5F5] text-[#1a1a1a] font-bold py-4 rounded-full text-[16px] hover:bg-[#eee] transition-colors">
            Continuar la conversa
          </button>
        </div>
      </div>
    )
  }

  // ===== CHAT VIEW =====
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="fixed top-0 md:top-14 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center justify-between max-w-[700px] mx-auto px-5 py-3">
          <button onClick={goBack} className="text-[15px] font-bold text-[#555] hover:text-[#1a1a1a]">← Tornar</button>
          <p className="text-[16px] font-extrabold text-[#1a1a1a]">{selected.title}</p>
          <div className="flex items-center gap-2">
            <button onClick={evaluateConversation} disabled={isEvaluating || messages.length < 3}
              className="bg-[#F5F5F5] text-[#1a1a1a] text-[12px] font-bold rounded-full px-3 py-1.5 hover:bg-[#eee] disabled:opacity-30 transition-colors">
              {isEvaluating ? '...' : '📊 Avaluar'}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 pt-16 md:pt-4 pb-48 md:pb-36">
        <div className="max-w-[700px] mx-auto space-y-4 pt-2">
          {messages.map(msg => (
            <div key={msg.id}>
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-5 py-3.5 ${
                  msg.error ? 'bg-[#FFEBEE] text-[#C62828] rounded-2xl rounded-bl-sm'
                  : msg.role === 'user' ? 'bg-[#1a1a1a] text-white rounded-2xl rounded-br-sm'
                  : 'bg-[#F5F5F5] text-[#1a1a1a] rounded-2xl rounded-bl-sm'
                }`}>
                  <p className="text-[17px] leading-relaxed">{msg.content}</p>
                  {msg.role === 'assistant' && !msg.error && hasTTS && (
                    <button onClick={() => speak(msg.content)} className="mt-2 text-[#777] hover:text-[#555] transition-colors flex items-center gap-1.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                      <span className="text-[13px] font-semibold">Escolta</span>
                    </button>
                  )}
                  {msg.error && (
                    <button onClick={() => { setMessages(prev => prev.filter(m => !m.error)); const last = [...messages].reverse().find(m => m.role === 'user'); if (last) sendDirect(last.content) }}
                      className="mt-2 text-[14px] font-bold text-[#C62828] underline">Reintentar</button>
                  )}
                </div>
              </div>
              {/* Correction with audio button */}
              {msg.correction && (
                <div className="flex justify-start mt-2">
                  <div className="max-w-[85%] bg-[#FFF8E1] rounded-xl p-4">
                    <p className="text-[15px] text-[#6D4C00] leading-relaxed mb-2">💡 {msg.correction}</p>
                    {hasTTS && (
                      <button onClick={() => speakCorrection(msg.correction!)}
                        className="flex items-center gap-2 bg-[#FFF0C0] rounded-full px-4 py-2 text-[14px] font-bold text-[#6D4C00] hover:bg-[#FFE8A0] transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                        Escolta la pronunciació correcta
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-[#F5F5F5] rounded-2xl rounded-bl-sm px-5 py-4">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#bbb] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                  <span className="w-2.5 h-2.5 bg-[#bbb] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                  <span className="w-2.5 h-2.5 bg-[#bbb] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef}/>
        </div>
      </div>

      {/* Input area */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-gray-100">
        <div className="max-w-[700px] mx-auto px-5 py-3">

          {/* Suggestions */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            <span className="text-[15px] font-bold text-[#999] flex-shrink-0 self-center">Exemples:</span>
            {currentSuggestions.map(s => (
              <button key={s} onClick={() => audioMode ? sendDirect(s) : setInput(s)}
                className="bg-[#F5F5F5] rounded-2xl px-5 py-3 text-[16px] text-[#333] hover:text-[#1a1a1a] hover:bg-[#ECECEC] transition-colors whitespace-nowrap flex-shrink-0 font-semibold">
                {s}
              </button>
            ))}
          </div>

          {audioMode ? (
            <div className="flex flex-col items-center gap-2">
              {isSpeaking && (
                <p className="text-[15px] font-semibold text-[#555] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#2E7D32] rounded-full animate-pulse"/> La IA està parlant...
                </p>
              )}
              {/* PUSH-TO-TALK: hold to record */}
              <button
                onMouseDown={startListening} onMouseUp={stopListening} onMouseLeave={stopListening}
                onTouchStart={(e) => { e.preventDefault(); startListening() }} onTouchEnd={stopListening}
                disabled={isTyping || isSpeaking}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all disabled:opacity-30 select-none ${
                  isRecording ? 'bg-[#C62828] scale-110' : 'bg-[#1a1a1a] hover:bg-[#333] active:scale-105'
                }`}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
                </svg>
              </button>
              <p className="text-[16px] font-semibold text-[#555]">
                {isRecording ? '🔴 Parlant...' : isTyping ? '⏳ Pensant...' : isSpeaking ? '' : 'Mantén premut per parlar'}
              </p>
              {/* Text fallback */}
              <div className="flex items-center gap-2 w-full mt-1">
                <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="O escriu aquí..." className="flex-1 bg-[#F5F5F5] border-0 rounded-full px-4 py-2.5 text-[15px] text-[#1a1a1a] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#E0E0E0]"/>
                {input.trim() && (
                  <button onClick={sendMessage} className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {hasSR && (
                <button onMouseDown={startListening} onMouseUp={stopListening} onMouseLeave={stopListening}
                  onTouchStart={(e) => { e.preventDefault(); startListening() }} onTouchEnd={stopListening}
                  className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors select-none ${
                    isRecording ? 'bg-[#C62828]' : 'bg-[#F5F5F5] text-[#555]'
                  }`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isRecording ? 'white' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
                  </svg>
                </button>
              )}
              <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Escriu en català..." className="flex-1 bg-[#F5F5F5] border-0 rounded-full px-5 py-3 text-[16px] text-[#1a1a1a] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#E0E0E0]"/>
              <button onClick={sendMessage} disabled={!input.trim() || isTyping}
                className="w-11 h-11 rounded-full bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 disabled:opacity-30 active:scale-95 transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
